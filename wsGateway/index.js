const http = require("http");
const socketIo = require('socket.io');
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { read_rabbit_msg, send_rabbit_msg } = require("./utils/rabbit_mq.js");
const httpServer = http.createServer();
httpServer.listen(4000);

const io = socketIo(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
    // options
});

io.on("connection", (socket) => {
    console.log("a user connected");

    const token = socket.handshake.auth.token;
    if (token != null) {
        jwt.verify(token, process.env.JWT_SECRET_KEY, (e, payload) => {
            if (e) {
                socket.emit('authError', e);
                return;
            }

            console.log("Connecting to user room:", payload.id)
            socket.join(payload.id);
            
            // Store user info in socket for later use
            socket.user = payload;
        });
    }

    // --- Real-time Collaboration Events ---

    socket.on('join-project', async (projectId) => {
        if (!socket.user) return; // Ensure authenticated
        console.log(`User ${socket.user.id} joining project ${projectId}`);
        socket.join(projectId);
        
        // Notify others in the room
        socket.to(projectId).emit('user-joined', { 
            userId: socket.user.id,
            userName: socket.user.name 
        });

        // Helper to get all users in a room
        const sockets = await io.in(projectId).fetchSockets();
        const activeUsers = sockets
            .map(s => s.user ? { id: s.user.id, name: s.user.name, email: s.user.email } : null)
            .filter(u => u !== null);
        
        // Remove duplicates based on ID
        const uniqueUsers = Array.from(new Map(activeUsers.map(item => [item.id, item])).values());

        // Send current active users to the joining user
        socket.emit('active-users', { users: uniqueUsers });
    });

    socket.on('leave-project', (projectId) => {
         if (!socket.user) return;
        console.log(`User ${socket.user.id} leaving project ${projectId}`);
        socket.leave(projectId);
        
        // Notify others
        socket.to(projectId).emit('user-left', { 
            userId: socket.user.id,
            userName: socket.user.name
        });
    });

    socket.on('edit-project', (data) => {
        if (!socket.user) return;
        
        // data: { projectId, action: 'add-image'|'remove-image'|'update-tool'..., content: ... }
        const { projectId, action, content } = data;
        
        console.log(`Project ${projectId} edit action: ${action} by ${socket.user.id}`);

        // 1. Broadcast to others (Fit Criterion: Visible in Real Time)
        socket.to(projectId).emit('project-updated', {
            userId: socket.user.id,
            userName: socket.user.name || "Unknown",
            action,
            content,
            timestamp: new Date().toISOString()
        });

        // 2. Queue for Persistence (RNF53: Concurrency Management)
        // Instead of calling HTTP PUT, we send to a queue ensuring serial execution
        const updateMsg = {
             messageId: crypto.randomUUID(),
             projectId: projectId,
             userId: socket.user.id,
             action: action, 
             content: content,
             timestamp: new Date().toISOString()
        };
        
        try {
            send_rabbit_msg(updateMsg, 'project_updates_queue');
        } catch (err) {
            console.error("Failed to queue update", err);
        }
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});


function process_msg() {
    read_rabbit_msg('ws_queue', (msg) => {
        const msg_content = JSON.parse(msg.content.toString());
        const msg_id = msg_content.messageId;
        const timestamp = msg_content.timestamp
        const status = msg_content.status;
        const user = msg_content.user;

        console.log('Received msg:', JSON.stringify(msg_content));

        if (/update-client-preview/.test(msg_id)) {
            // Logic for preview updates (existing)
             if (status == "error") {
                io.to(user).emit("preview-error", msg_content);
            } else {
                // Emit "preview-ready" - this is what the frontend listens for
                io.to(user).emit("preview-ready", msg_content);
            }
        } else if (msg_id === 'project-update') {
            // Logic for project structural updates
            if (msg_content.projectId) {
                io.to(msg_content.projectId).emit("project-updated", {
                     action: msg_content.action,
                     content: msg_content.content,
                     timestamp: timestamp
                });
            }
        } else {
             // Logic for process usage (existing)
             if (status == "error") {
                io.to(user).emit("process-error", msg_content);
            } else {
                // RNF-53: Broadcast to everyone in the project instructions
                if (msg_content.projectId) {
                    io.to(msg_content.projectId).emit("process-update", msg_content);
                } else {
                    // Fallback for legacy messages
                    io.to(user).emit("process-update", msg_content);
                }
            }
        }
    });
}

process_msg();
