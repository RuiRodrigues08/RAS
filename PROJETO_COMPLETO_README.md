# 📖 PictuRAS - Documentação Completa do Projeto

**Your personal, intuitive and powerful image editor.**

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura do Sistema](#-arquitetura-do-sistema)
3. [Componentes Principais](#-componentes-principais)
4. [Fluxo de Dados](#-fluxo-de-dados)
5. [Tecnologias Utilizadas](#-tecnologias-utilizadas)
6. [Estrutura de Diretórios](#-estrutura-de-diretórios)
7. [Como Funciona](#-como-funciona)
8. [Casos de Uso](#-casos-de-uso)
9. [Segurança](#-segurança)
10. [Escalabilidade](#-escalabilidade)
11. [Problemas Conhecidos](#-problemas-conhecidos)
12. [Melhorias Futuras](#-melhorias-futuras)

---

## 🎯 Visão Geral

### O que é o PictuRAS?

PictuRAS é uma **plataforma web de edição de imagens** que combina:
- ✅ Ferramentas tradicionais de edição (brilho, contraste, rotação, etc.)
- 🤖 Ferramentas de IA avançadas (remoção de fundo, detecção de objetos, OCR)
- 👥 Sistema de utilizadores com autenticação
- 💳 Sistema de subscrições (planos Free e Premium)
- 📦 Gestão de projetos e processamento em lote

### Para quem é?

- **Utilizadores finais**: Interface intuitiva para editar imagens sem conhecimentos técnicos
- **Empresas**: Processamento em lote de imagens
- **Estudantes**: Projeto educacional sobre arquiteturas de microserviços

---

## 🏗️ Arquitetura do Sistema

### Padrão Arquitetural: **Microserviços**

O sistema é dividido em **serviços independentes** que comunicam entre si via:
- **REST API** (HTTP) para operações síncronas
- **RabbitMQ** (Message Queue) para operações assíncronas
- **WebSocket** para atualizações em tempo real

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX (Port 8080)                        │
│                     Load Balancer / Proxy                       │
└──────────────────────┬──────────────────┬──────────────────────┘
                       │                   │
        ┌──────────────┴──────┐   ┌────────┴────────┐
        │   Frontend (3000)   │   │  WS Gateway     │
        │   Next.js + React   │   │  (4000)         │
        └──────────┬──────────┘   └────────┬────────┘
                   │                       │
        ┌──────────┴──────────────────────┴────────┐
        │      API Gateway (8000)                   │
        │      Autenticação JWT                     │
        └──┬─────────┬────────────┬─────────────┬──┘
           │         │            │             │
    ┌──────┴───┐ ┌──┴─────┐ ┌────┴─────┐ ┌────┴──────┐
    │  Users   │ │Projects│ │Subscript.│ │ ImgStore  │
    │ (10001)  │ │ (9002) │ │ (11001)  │ │ (11000)   │
    └────┬─────┘ └───┬────┘ └────┬─────┘ └─────┬─────┘
         │           │           │             │
    ┌────┴────┐ ┌────┴────┐ ┌────┴────┐  ┌────┴─────┐
    │ MongoDB │ │ MongoDB │ │ MongoDB │  │  MinIO   │
    │ (27019) │ │ (27018) │ │ (27017) │  │  (9000)  │
    └─────────┘ └─────────┘ └─────────┘  └──────────┘
                     │
           ┌─────────┴──────────┐
           │   RabbitMQ (5672)  │
           │   Message Queue    │
           └─────────┬──────────┘
                     │
    ┌────────────────┼────────────────────┐
    │                │                    │
┌───┴────┐  ┌───────┴────┐  ┌───────────┴────┐
│ Tools  │  │  AI Tools  │  │ Traditional    │
│ Python │  │  (AI/ML)   │  │ Tools          │
└────────┘  └────────────┘  └────────────────┘
   12+          5              7+
```

### Fluxo de Comunicação

**Síncrono (REST API):**
```
Frontend → Nginx → API Gateway → Microserviço → MongoDB
```

**Assíncrono (Message Queue):**
```
Frontend → API → Projects → RabbitMQ → Tool Consumer → Processing
                                    ↓
                             WS Gateway → Frontend (Update)
```

---

## 🧩 Componentes Principais

### 1. **Frontend (Next.js 15 + React 19)**

**Localização**: `frontend/`
**Porta**: 3000 (interna), 8080 (Nginx)
**Responsabilidades**:
- Interface de utilizador (UI/UX)
- Gestão de estado com React Query
- Autenticação com JWT
- Upload de imagens
- Visualização de resultados em tempo real
- Gestão de projetos e ferramentas

**Tecnologias**:
- **Next.js 15**: Framework React com SSR/SSG
- **React 19**: Biblioteca UI
- **TypeScript**: Tipagem estática
- **Tailwind CSS**: Styling utility-first
- **shadcn/ui**: Componentes UI baseados em Radix
- **React Query**: Gestão de estado servidor
- **Axios**: Requisições HTTP
- **Socket.IO Client**: WebSocket para tempo real

**Principais Diretórios**:
```
frontend/
├── app/                    # App Router (Next.js 15)
│   ├── page.tsx           # Página inicial
│   ├── dashboard/         # Dashboard do utilizador
│   ├── login/             # Página de login
│   └── register/          # Página de registo
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn)
│   ├── toolbar/          # Barra de ferramentas
│   └── project-page/     # Componentes de projeto
├── lib/                  # Utilitários e configuração
│   ├── axios.ts          # Cliente HTTP
│   ├── queries/          # React Query queries
│   └── mutations/        # React Query mutations
├── hooks/                # Custom hooks
│   ├── use-toast.ts      # Sistema de notificações
│   └── use-mobile.tsx    # Detecção mobile
└── providers/            # Context providers
    ├── session-provider.tsx
    └── project-provider.tsx
```

---

### 2. **API Gateway (Express.js)**

**Localização**: `apiGateway/`
**Porta**: 8000
**Responsabilidades**:
- **Ponto único de entrada** para todas as requisições
- **Autenticação JWT**: Valida tokens
- **Roteamento**: Direciona requisições aos microserviços
- **Proxy reverso**: Encaminha pedidos

**Tecnologias**:
- Express.js (Node.js)
- JWT (jsonwebtoken)
- Axios (comunicação com serviços)
- Multer (upload de ficheiros)

**Rotas**:
```javascript
/users/*          → Users Service (10001)
/projects/*       → Projects Service (9002)
/subscriptions/*  → Subscriptions Service (11001)
```

**Middleware de Autenticação**:
```javascript
// auth/auth.js
- Verifica token JWT no header Authorization
- Extrai payload (userId, email, etc.)
- Valida com JWT_SECRET_KEY="lisan_al_gaib"
```

---

### 3. **Users Service (Express.js + MongoDB)**

**Localização**: `users/`
**Porta**: 10001
**Base de Dados**: MongoDB (27019)
**Responsabilidades**:
- Registo de utilizadores
- Login e autenticação
- Gestão de perfis
- Controlo de operações diárias (FREE_DAILY_OP=5)

**Modelo de Dados (User)**:
```javascript
{
  _id: ObjectId,
  email: String (único),
  password: String (hash),
  name: String,
  subscriptionType: "free" | "premium",
  dailyOperations: Number,
  lastOperationDate: Date,
  createdAt: Date
}
```

**Endpoints**:
- `POST /register`: Criar conta
- `POST /login`: Autenticar e receber JWT
- `GET /profile`: Obter dados do utilizador
- `PUT /profile`: Atualizar perfil
- `GET /operations`: Verificar operações disponíveis

---

### 4. **Projects Service (Express.js + MongoDB)**

**Localização**: `projects/`
**Porta**: 9002
**Base de Dados**: MongoDB (27018)
**Responsabilidades**:
- **Orquestração central** do processamento de imagens
- Gestão de projetos
- Criação de jobs no RabbitMQ
- Coordenação entre ferramentas
- Gestão de filas de processamento

**Modelo de Dados (Project)**:
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  name: String,
  images: [
    {
      imageId: String,
      originalUrl: String,
      processedUrl: String,
      status: "pending" | "processing" | "completed" | "error",
      operations: [
        {
          tool: String,
          parameters: Object,
          status: String,
          timestamp: Date
        }
      ]
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**Fluxo de Processamento**:
1. Frontend envia requisição com imagem + ferramenta
2. Projects valida e salva metadados
3. **Publica mensagem no RabbitMQ** com:
   ```json
   {
     "messageId": "brightness-image-123",
     "user": "user-id",
     "imageUrl": "http://minio:9000/bucket/image.jpg",
     "tool": "brightness",
     "parameters": { "value": 50 },
     "timestamp": "2025-12-31T10:00:00Z"
   }
   ```
4. Tool consumer processa a imagem
5. Resultado enviado via WebSocket
6. Frontend atualiza UI

**Integrações**:
- **RabbitMQ**: Publica jobs de processamento
- **MinIO**: URLs de imagens
- **MongoDB**: Persistência de projetos

---

### 5. **Subscriptions Service (Express.js + MongoDB)**

**Localização**: `subscriptions/`
**Porta**: 11001
**Base de Dados**: MongoDB (27017)
**Responsabilidades**:
- Gestão de planos (Free vs Premium)
- Processamento de pagamentos
- Limites de uso
- Histórico de faturação

**Planos**:
```javascript
Free: {
  operationsPerDay: 5,
  maxProjects: 3,
  maxImagesPerProject: 10,
  aiTools: false
}

Premium: {
  operationsPerDay: Unlimited,
  maxProjects: Unlimited,
  maxImagesPerProject: Unlimited,
  aiTools: true,
  price: "$9.99/month"
}
```

---

### 6. **Image Storage Service + MinIO**

**Localização**: `imageStorageService/` + `minio/`
**Porta**: 11000 (Service), 9000 (MinIO), 9090 (Console)
**Responsabilidades**:
- Upload de imagens para MinIO
- Geração de URLs presigned
- Gestão de buckets
- Deleção de ficheiros

**MinIO (Object Storage)**:
- Compatível com S3 API
- Armazenamento escalável
- Credenciais: `admin/admin123`

**Endpoints (Image Storage Service)**:
- `POST /upload`: Upload de imagem
- `GET /image/:id`: Obter URL presigned
- `DELETE /image/:id`: Eliminar imagem

---

### 7. **WebSocket Gateway (Socket.IO)**

**Localização**: `wsGateway/`
**Porta**: 4000
**Responsabilidades**:
- **Comunicação bidirecional** em tempo real
- Notificações de progresso
- Atualizações de preview
- Erros de processamento

**Funcionamento**:
1. Cliente conecta com token JWT
2. Socket join na "room" do userId
3. Tool consumer publica resultado no RabbitMQ (`ws_queue`)
4. WS Gateway consome mensagens
5. Emite eventos para o cliente específico

**Eventos Emitidos**:
```javascript
"preview-ready": URL da imagem processada
"preview-error": Erro no processamento
"process-update": Atualização de progresso
"process-error": Erro geral
```

**Autenticação WebSocket**:
```javascript
socket.handshake.auth.token → JWT verification → socket.join(userId)
```

---

### 8. **RabbitMQ (Message Queue)**

**Localização**: `rabbitMQ/`
**Porta**: 5672 (AMQP), 15672 (Management UI)
**Credenciais**: `user/password`
**Responsabilidades**:
- **Desacoplamento** entre serviços
- Filas de processamento
- Garantia de entrega
- Balanceamento de carga entre workers

**Filas Principais**:
```
brightness_queue     → Brightness Tool
contrast_queue       → Contrast Tool
saturation_queue     → Saturation Tool
resize_queue         → Resize Tool
rotate_queue         → Rotate Tool
cut_queue            → Cut Tool
binarization_queue   → Binarization Tool
border_queue         → Border Tool
bg_remove_queue      → AI Background Removal
obj_detect_queue     → AI Object Detection
people_detect_queue  → AI People Detection
text_ocr_queue       → AI Text Recognition
enhance_queue        → AI Image Enhancement
cut_ai_queue         → AI Smart Crop
ws_queue             → WebSocket Updates
```

**Padrão de Mensagem**:
```json
{
  "messageId": "tool-operation-imageId",
  "user": "userId",
  "imageUrl": "http://minio:9000/bucket/image.jpg",
  "tool": "brightness",
  "parameters": { "value": 50 },
  "timestamp": "2025-12-31T10:00:00Z",
  "status": "pending" | "processing" | "completed" | "error"
}
```

---

### 9. **Processing Tools (Python + OpenCV + AI)**

**Localização**: `Tools/`
**Tecnologias**: Python, Pillow, OpenCV, PyTorch, YOLO
**Padrão**: **Consumer Pattern** (cada tool é um consumer de fila)

#### 9.1 Ferramentas Tradicionais

**Brightness** (`brightness/`):
- Ajusta brilho da imagem
- Parâmetro: `value` (-100 a +100)
- Implementação: `PIL.ImageEnhance.Brightness`

**Contrast** (`contrast/`):
- Ajusta contraste
- Parâmetro: `value` (0 a 200)
- Implementação: `PIL.ImageEnhance.Contrast`

**Saturation** (`saturation/`):
- Ajusta saturação de cores
- Parâmetro: `value` (0 a 200)
- Implementação: `PIL.ImageEnhance.Color`

**Resize** (`resize/`):
- Redimensiona imagem
- Parâmetros: `width`, `height`
- Mantém aspect ratio opcional

**Rotate** (`rotate/`):
- Rotaciona imagem
- Parâmetro: `angle` (0-360°)
- Implementação: `PIL.Image.rotate`

**Cut** (`cut/`):
- Crop manual da imagem
- Parâmetros: `x`, `y`, `width`, `height`

**Binarization** (`binarization/`):
- Converte para preto e branco
- Parâmetro: `threshold` (0-255)
- Implementação: `PIL.Image.convert('1')`

**Border** (`border/`):
- Adiciona borda à imagem
- Parâmetros: `size`, `color`

#### 9.2 Ferramentas de IA

**Background Removal AI** (`bg_remove_ai/`):
- Remove fundo automaticamente
- Modelo: U²-Net ou similar
- Uso: Produtos, retratos, design

**Object Detection AI** (`obj_ai/`):
- Deteta e classifica objetos
- Modelo: YOLO (You Only Look Once)
- Output: Bounding boxes + labels

**People Detection AI** (`people_ai/`):
- Conta e localiza pessoas
- Modelo: YOLO trained on COCO dataset
- Uso: Análise de multidões, segurança

**Text Recognition AI** (`text_ai/`):
- OCR (Optical Character Recognition)
- Modelo: Tesseract ou similar
- Extrai texto de imagens

**Image Enhancement AI** (`upgrade_ai/`):
- Upscaling e melhoria de qualidade
- Modelo: ESRGAN ou similar
- Aumenta resolução e nitidez

**Smart Crop AI** (`cut_ai/`):
- Crop inteligente baseado em conteúdo
- Deteta regiões de interesse
- Modelo: Saliency detection

#### Estrutura de um Tool (Consumer Pattern)

```python
# Exemplo: brightness/consumer.py
import pika
from PIL import Image, ImageEnhance
import requests
from io import BytesIO

# Conecta ao RabbitMQ
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='rabbitmq')
)
channel = connection.channel()
channel.queue_declare(queue='brightness_queue', durable=True)

def process_image(ch, method, properties, body):
    # 1. Parse mensagem
    message = json.loads(body)
    image_url = message['imageUrl']
    brightness_value = message['parameters']['value']
    user_id = message['user']
    
    # 2. Download imagem do MinIO
    response = requests.get(image_url)
    img = Image.open(BytesIO(response.content))
    
    # 3. Processa imagem
    enhancer = ImageEnhance.Brightness(img)
    img_processed = enhancer.enhance(1 + brightness_value/100)
    
    # 4. Upload resultado para MinIO
    # ...
    
    # 5. Publica resultado na ws_queue
    result_message = {
        'messageId': 'update-client-preview',
        'user': user_id,
        'img_url': processed_url,
        'status': 'completed',
        'timestamp': datetime.now().isoformat()
    }
    channel.basic_publish(
        exchange='',
        routing_key='ws_queue',
        body=json.dumps(result_message)
    )
    
    # 6. ACK mensagem
    ch.basic_ack(delivery_tag=method.delivery_tag)

# Consome mensagens
channel.basic_qos(prefetch_count=1)
channel.basic_consume(
    queue='brightness_queue',
    on_message_callback=process_image
)

channel.start_consuming()
```

---

### 10. **Nginx (Load Balancer)**

**Localização**: `nginx/`
**Porta**: 8080 (entrada principal)
**Responsabilidades**:
- **Ponto de entrada único** do sistema
- Roteamento de tráfego
- Proxy reverso
- Configuração de CORS

**Configuração de Rotas**:
```nginx
/ → frontend:3000                # Interface web
/api-gateway/* → api_gateway:8000  # APIs
/ws → ws_gateway:4000            # WebSocket
/minio/* → minio:9000            # Storage direto
```

---

## 🔄 Fluxo de Dados

### Caso 1: Upload e Processamento de Imagem

```
┌─────────┐
│ 1. User │ Upload de imagem "photo.jpg"
└────┬────┘
     │
     ▼
┌────────────┐
│ 2. Frontend│ POST /api-gateway/projects/upload
└────┬───────┘ (multipart/form-data)
     │
     ▼
┌─────────────┐
│ 3. API GW   │ Valida JWT → Encaminha
└────┬────────┘
     │
     ▼
┌─────────────┐
│ 4. Projects │ → Salva metadados no MongoDB
└────┬────────┘ → Upload para MinIO via Image Storage
     │         → Retorna imageId
     ▼
┌─────────────┐
│ 5. Frontend │ Exibe imagem no editor
└─────────────┘


┌─────────┐
│ 6. User │ Clica em "Brightness +50"
└────┬────┘
     │
     ▼
┌────────────┐
│ 7. Frontend│ POST /api-gateway/projects/:id/process
└────┬───────┘ { tool: "brightness", params: { value: 50 } }
     │
     ▼
┌─────────────┐
│ 8. Projects │ → Cria job no MongoDB
└────┬────────┘ → Publica mensagem no RabbitMQ (brightness_queue)
     │
     ▼
┌──────────────┐
│ 9. RabbitMQ  │ Mensagem na fila...
└────┬─────────┘
     │
     ▼
┌──────────────────┐
│10. Brightness    │ → Consome mensagem
│    Tool (Python) │ → Download imagem do MinIO
└────┬─────────────┘ → Processa (aplica brilho)
     │               → Upload resultado para MinIO
     │               → Publica na ws_queue
     ▼
┌──────────────┐
│11. RabbitMQ  │ Mensagem na ws_queue
└────┬─────────┘
     │
     ▼
┌──────────────┐
│12. WS Gateway│ → Consome mensagem
└────┬─────────┘ → Emite evento "preview-ready" para userId
     │
     ▼
┌────────────┐
│13. Frontend│ → Recebe evento via WebSocket
└────┬───────┘ → Atualiza preview com nova URL
     │
     ▼
┌─────────┐
│14. User │ Vê resultado em tempo real!
└─────────┘
```

### Caso 2: Autenticação

```
┌─────────┐
│ 1. User │ Preenche login form (email + password)
└────┬────┘
     │
     ▼
┌────────────┐
│ 2. Frontend│ POST /api-gateway/users/login
└────┬───────┘ { email, password }
     │
     ▼
┌─────────────┐
│ 3. API GW   │ Encaminha para Users Service
└────┬────────┘
     │
     ▼
┌──────────────┐
│ 4. Users     │ → Busca user no MongoDB
│   Service    │ → Verifica password (bcrypt)
└────┬─────────┘ → Gera JWT token (jwt.sign)
     │
     ▼
┌────────────┐
│ 5. Frontend│ Recebe token
└────┬───────┘ → Armazena em localStorage
     │         → Inclui em todas as requisições (Authorization: Bearer)
     ▼
┌─────────┐
│ 6. User │ Autenticado! Acesso ao dashboard
└─────────┘
```

### Caso 3: Verificação de Subscrição

```
┌─────────┐
│ 1. User │ Tenta usar ferramenta AI
└────┬────┘
     │
     ▼
┌────────────┐
│ 2. Frontend│ Verifica subscription localmente
└────┬───────┘ → Se Free: bloqueia + mostra upgrade dialog
     │         → Se Premium: prossegue
     ▼
┌─────────────┐
│ 3. API GW   │ Valida token → Verifica role no payload
└────┬────────┘ → Se Free e ferramenta=AI: retorna 403
     │
     ▼
┌──────────────────┐
│ 4. Subscriptions │ Endpoint: GET /subscription/status
└────┬─────────────┘ → Retorna plano atual + limites
     │
     ▼
┌────────────┐
│ 5. Frontend│ Mostra informação de upgrade
└────────────┘
```

---

## 💻 Tecnologias Utilizadas

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 15.1.3 | Framework React |
| React | 19.0.0 | UI Library |
| TypeScript | 5.x | Tipagem estática |
| Tailwind CSS | 3.x | Styling |
| Radix UI | 1.x | Componentes UI |
| React Query | 5.63.0 | State management |
| Axios | 1.7.9 | HTTP Client |
| Socket.IO Client | 4.x | WebSocket |
| JSZip | 3.10.1 | Download em lote |

### Backend Services
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Node.js | 18.x | Runtime JavaScript |
| Express.js | 4.16.x | Framework web |
| MongoDB | 4.4 | Base de dados NoSQL |
| Mongoose | 8.9.x | ODM para MongoDB |
| JWT | 9.0.2 | Autenticação |
| Multer | 1.4.5 | Upload de ficheiros |
| Axios | 1.7.9 | HTTP Client |
| amqplib | 0.10.5 | Cliente RabbitMQ |

### Processing Tools
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Python | 3.10+ | Linguagem |
| Pillow | 11.0.0 | Processamento de imagens |
| OpenCV | 4.x | Computer Vision |
| pika | 1.3.2 | Cliente RabbitMQ |
| PyTorch | 2.x | Deep Learning (AI tools) |
| YOLO | 8.x | Object Detection |
| Tesseract | 5.x | OCR |

### Infrastructure
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Docker | 24.x | Containerização |
| Docker Compose | 2.x | Orquestração |
| Nginx | latest | Load Balancer |
| RabbitMQ | 3.12 | Message Queue |
| MinIO | 2024-05 | Object Storage |
| ELK Stack | 7.6 | Logging (opcional) |

---

## 📂 Estrutura de Diretórios

```
RAS/
│
├── frontend/                      # 🎨 Interface Web (Next.js)
│   ├── app/                      # App Router (Next.js 15)
│   ├── components/               # Componentes React
│   ├── lib/                      # Utilities e configuração
│   ├── hooks/                    # Custom hooks
│   ├── providers/                # Context providers
│   ├── public/                   # Assets estáticos
│   └── package.json
│
├── apiGateway/                   # 🚪 API Gateway
│   ├── routes/                   # Rotas (users, projects, subscriptions)
│   ├── auth/                     # Middleware de autenticação
│   ├── app.js                    # Aplicação Express
│   └── package.json
│
├── users/                        # 👤 User Management Service
│   ├── models/                   # Modelos MongoDB (User)
│   ├── controllers/              # Lógica de negócio
│   ├── routes/                   # Endpoints
│   ├── auth/                     # JWT generation/validation
│   └── package.json
│
├── projects/                     # 📁 Projects Orchestration Service
│   ├── models/                   # Modelos MongoDB (Project)
│   ├── controllers/              # Orquestração de jobs
│   ├── routes/                   # Endpoints
│   ├── utils/                    # RabbitMQ publisher
│   └── package.json
│
├── subscriptions/                # 💳 Subscription Management
│   ├── models/                   # Modelos MongoDB (Subscription)
│   ├── controllers/              # Lógica de planos
│   ├── routes/                   # Endpoints
│   └── package.json
│
├── imageStorageService/          # 🗄️ Image Storage Interface
│   ├── routes/                   # Upload/download endpoints
│   └── package.json
│
├── minio/                        # 📦 MinIO S3 Storage
│   ├── services/                 # S3 Client e operações
│   ├── route/                    # Endpoints (upload, delete)
│   └── server.js
│
├── wsGateway/                    # 🔌 WebSocket Gateway
│   ├── utils/                    # RabbitMQ consumer
│   └── index.js                  # Socket.IO server
│
├── rabbitMQ/                     # 🐰 Message Queue Config
│   ├── definitions.json          # Filas e exchanges
│   ├── rabbitmq.conf            # Configuração
│   └── Dockerfile
│
├── nginx/                        # ⚖️ Load Balancer
│   └── nginx.conf               # Configuração de rotas
│
├── Tools/                        # 🛠️ Processing Tools (Python)
│   ├── bg_remove_ai/            # AI: Remoção de fundo
│   ├── obj_ai/                  # AI: Detecção de objetos
│   ├── people_ai/               # AI: Detecção de pessoas
│   ├── text_ai/                 # AI: OCR
│   ├── upgrade_ai/              # AI: Melhoria de imagem
│   ├── cut_ai/                  # AI: Crop inteligente
│   ├── brightness/              # Brilho
│   ├── contrast/                # Contraste
│   ├── saturation/              # Saturação
│   ├── resize/                  # Redimensionamento
│   ├── rotate/                  # Rotação
│   ├── cut/                     # Crop manual
│   ├── binarization/            # Binarização
│   ├── border/                  # Borda
│   ├── models/                  # Modelos AI (YOLO, etc.)
│   ├── utils/                   # Utilitários partilhados
│   └── requirements.txt
│
├── docker-compose.yaml           # 🐳 Orquestração de containers
├── README.md                     # Documentação original
└── LICENSE                       # CC BY-NC-SA 4.0
```

---

## 🎬 Como Funciona

### Inicialização do Sistema

```bash
# 1. Construir e iniciar todos os serviços
docker compose up --build

# Ordem de inicialização:
# 1. MongoDB instances (3x)
# 2. RabbitMQ (aguarda healthcheck)
# 3. MinIO
# 4. Backend services (Users, Projects, Subscriptions, Image Storage)
# 5. API Gateway
# 6. WebSocket Gateway
# 7. Processing Tools (12+ containers)
# 8. Frontend
# 9. Nginx
```

### Healthchecks e Dependências

```yaml
# docker-compose.yaml
rabbitmq:
  healthcheck:
    test: ["CMD-SHELL", "rabbitmqctl status"]
    interval: 30s
    timeout: 10s
    retries: 5

projects:
  depends_on:
    rabbitmq:
      condition: service_healthy  # Aguarda RabbitMQ estar pronto
```

### Variáveis de Ambiente

```bash
# API Gateway + Services
JWT_SECRET_KEY=lisan_al_gaib     # Segredo JWT (⚠️ MUDAR EM PRODUÇÃO!)

# Users Service
FREE_DAILY_OP=5                   # Operações diárias grátis

# MinIO
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=admin123      # ⚠️ MUDAR EM PRODUÇÃO!
MINIO_DOMAIN=minio:9000

# RabbitMQ
RABBITMQ_DEFAULT_USER=user
RABBITMQ_DEFAULT_PASS=password    # ⚠️ MUDAR EM PRODUÇÃO!

# Subscriptions
SECRET_KEY=card_secret_key        # ⚠️ Para pagamentos

# Frontend
FRONTEND_URL=http://localhost:8080
```

---

## 📖 Casos de Uso

### Caso de Uso 1: Utilizador Free Edita Foto de Perfil

**Actor**: João (utilizador free)
**Goal**: Melhorar foto de perfil removendo fundo

**Fluxo**:
1. João acede a http://localhost:8080
2. Regista conta (email + password)
3. Cria projeto "Foto Perfil"
4. Upload de `perfil.jpg` (2MB)
5. Clica na ferramenta "Brightness"
6. Ajusta slider para +30
7. Aguarda 2 segundos → Preview atualiza
8. Clica em "Remover Fundo" (AI)
9. **Bloqueado**: "Esta ferramenta requer plano Premium"
10. Clica em "Crop"
11. Seleciona área de interesse
12. Download da imagem final

**Operações Consumidas**: 3/5 (Brightness + Crop + Download)

---

### Caso de Uso 2: Empresa Processa Lote de Produtos

**Actor**: Empresa XYZ (conta premium)
**Goal**: Remover fundo de 50 fotos de produtos

**Fluxo**:
1. Login com conta premium
2. Cria projeto "Produtos Loja Online"
3. Upload de 50 imagens (drag & drop)
4. Seleciona todas as imagens
5. Aplica "Remover Fundo" em lote
6. RabbitMQ distribui 50 jobs
7. 5 workers processam em paralelo (10 jobs cada)
8. WebSocket atualiza progresso: "15/50 completo"
9. Após 5 minutos: "50/50 completo"
10. Clica em "Download All" → ZIP gerado
11. Descarrega `produtos-processados.zip`

**Vantagem**: Processamento paralelo → 5x mais rápido

---

### Caso de Uso 3: Desenvolvedor Adiciona Nova Ferramenta

**Actor**: Desenvolvedor
**Goal**: Adicionar ferramenta "Desfoque"

**Passos**:
1. Criar diretório `Tools/blur/`
2. Criar `Dockerfile`:
   ```dockerfile
   FROM python:3.10-slim
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY blur.py .
   CMD ["python", "blur.py"]
   ```
3. Criar `blur.py` (consumer):
   ```python
   # Conecta a blur_queue
   # Processa imagem com PIL.ImageFilter.GaussianBlur
   # Publica resultado em ws_queue
   ```
4. Adicionar ao `docker-compose.yaml`:
   ```yaml
   blur_tool:
     build:
       context: ./Tools
       dockerfile: blur/Dockerfile
     depends_on:
       rabbitmq:
         condition: service_healthy
     volumes:
       - image_data:/app/images
   ```
5. Frontend: Adicionar botão "Blur" em `toolbar/`
6. Backend (Projects): Adicionar rota para `blur_queue`
7. Reiniciar sistema: `docker compose up --build`

**Resultado**: Nova ferramenta disponível em toda a plataforma!

---

## 🔒 Segurança

### Autenticação e Autorização

#### JWT (JSON Web Token)
```javascript
// Geração (Users Service)
const token = jwt.sign(
  { 
    id: user._id, 
    email: user.email,
    subscription: user.subscriptionType 
  },
  'lisan_al_gaib',  // SECRET_KEY
  { expiresIn: '7d' }
);

// Validação (API Gateway)
jwt.verify(token, 'lisan_al_gaib', (err, payload) => {
  if (err) return res.status(401).json({ error: 'Unauthorized' });
  req.user = payload;  // Injeta dados do utilizador
  next();
});
```

#### Fluxo de Autenticação
```
1. Login → Users Service gera JWT
2. Frontend armazena token (localStorage)
3. Todas as requisições incluem: Authorization: Bearer <token>
4. API Gateway valida token
5. Se válido: encaminha com user payload
6. Se inválido: retorna 401 Unauthorized
```

### Proteção de Dados

**Passwords**:
- ✅ Hash com bcrypt (salt rounds: 10)
- ❌ NUNCA armazenadas em plain text

**Tokens JWT**:
- ⚠️ **PROBLEMA**: SECRET_KEY hardcoded (`lisan_al_gaib`)
- 🔧 **MELHORIA**: Usar variável de ambiente + rotação de chaves

**MinIO**:
- Acesso via URLs presigned (expiração: 1 hora)
- Credenciais não expostas ao frontend

### CORS (Cross-Origin Resource Sharing)

```javascript
// API Gateway
app.use(cors());  // ⚠️ Permite TODAS as origens

// Nginx
add_header 'Access-Control-Allow-Origin' '*' always;  // ⚠️ Muito permissivo

// ✅ MELHORIA: Restringir origens
const corsOptions = {
  origin: ['http://localhost:8080', 'https://picturas.com'],
  credentials: true
};
app.use(cors(corsOptions));
```

### Vulnerabilidades Conhecidas

| Vulnerabilidade | Severidade | Mitigação |
|-----------------|------------|-----------|
| SECRET_KEY hardcoded | 🔴 Alta | Usar variáveis de ambiente |
| CORS aberto | 🟡 Média | Restringir origens |
| Sem rate limiting | 🟡 Média | Implementar throttling |
| Passwords em logs | 🟡 Média | Sanitizar logs |
| Uploads sem validação | 🟡 Média | Validar mime type + tamanho |
| Sem HTTPS | 🔴 Alta | Certificados SSL/TLS |

---

## 📈 Escalabilidade

### Arquitetura Preparada para Escalar

#### 1. **Escalabilidade Horizontal (Mais Containers)**

```yaml
# docker-compose.yaml
brightness_tool:
  deploy:
    replicas: 5  # 5 workers processando brightness
  # RabbitMQ distribui jobs entre workers automaticamente
```

**Vantagem**: Quanto mais workers, maior o throughput

#### 2. **Load Balancing (Nginx)**

```nginx
upstream api_gateway {
  server api_gateway_1:8000;
  server api_gateway_2:8000;
  server api_gateway_3:8000;
  # Round-robin automático
}
```

#### 3. **Message Queue (Desacoplamento)**

- **Problema**: 1000 utilizadores processam imagens ao mesmo tempo
- **Solução**: RabbitMQ armazena jobs em fila
- Workers processam na sua capacidade
- Nenhuma requisição perdida

#### 4. **Stateless Services**

- Todos os serviços são **stateless** (sem estado local)
- Estado armazenado em MongoDB e MinIO
- Qualquer container pode processar qualquer requisição
- **Permite**: Kill e restart sem perda de dados

### Gargalos Identificados

| Componente | Gargalo | Solução |
|------------|---------|---------|
| MongoDB | Single instance | Replica Set |
| MinIO | Single instance | Distributed mode |
| RabbitMQ | Single node | Clustering |
| AI Tools | GPU limitada | GPU-enabled containers |
| Network | Docker bridge | Overlay network |

### Estratégia de Scaling Recomendada

**Pequena escala (< 1000 users)**:
- Configuração atual (docker-compose)
- 1-2 replicas por tool

**Média escala (1000-10000 users)**:
- Kubernetes (K8s) deployment
- Horizontal Pod Autoscaler (HPA)
- MongoDB Replica Set (3 nodes)
- Redis cache para sessões

**Grande escala (10000+ users)**:
- Kubernetes multi-region
- CDN para assets estáticos
- MinIO distributed (4+ nodes)
- RabbitMQ cluster (3+ nodes)
- API Gateway com rate limiting (Kong/Traefik)

---

## ⚠️ Problemas Conhecidos

### 1. **Segurança**
- ❌ JWT SECRET hardcoded
- ❌ Credenciais em plain text no docker-compose
- ❌ CORS totalmente aberto
- ❌ Sem HTTPS

### 2. **Performance**
- ❌ Sem cache (Redis)
- ❌ Uploads bloqueiam thread (sem streaming)
- ❌ Sem compressão de imagens

### 3. **Escalabilidade**
- ❌ MongoDB single instance (não replica set)
- ❌ MinIO single instance
- ❌ RabbitMQ single node

### 4. **Observabilidade**
- ❌ Logging não centralizado (ELK comentado)
- ❌ Sem métricas (Prometheus/Grafana)
- ❌ Sem tracing distribuído (Jaeger)
- ❌ Sem alertas

### 5. **Frontend**
- ❌ Toast delay excessivo (1000 segundos)
- ❌ Sem lazy loading de componentes
- ❌ Imagens não otimizadas (sem Next/Image)

### 6. **DevOps**
- ❌ Sem CI/CD pipeline
- ❌ Sem testes automatizados
- ❌ Sem health checks em todos os serviços
- ❌ Volumes Docker sem backup strategy

---

## 🚀 Melhorias Futuras

### Prioridade Alta (Must Have)

1. **Segurança**
   - [ ] Migrar secrets para .env
   - [ ] Implementar HTTPS (Let's Encrypt)
   - [ ] Rate limiting (express-rate-limit)
   - [ ] Input validation (Joi/Yup)
   - [ ] CORS restrito

2. **Observabilidade**
   - [ ] Logging centralizado (ELK stack)
   - [ ] Métricas (Prometheus + Grafana)
   - [ ] Health checks em todos os serviços
   - [ ] Distributed tracing

3. **Performance**
   - [ ] Redis cache para sessões
   - [ ] Compressão de imagens (Sharp)
   - [ ] CDN para assets
   - [ ] Lazy loading no frontend

### Prioridade Média (Should Have)

4. **Funcionalidades**
   - [ ] Histórico de edições (undo/redo)
   - [ ] Colaboração em tempo real
   - [ ] Templates de edição
   - [ ] Integração com redes sociais
   - [ ] Mobile app (React Native)

5. **Escalabilidade**
   - [ ] Kubernetes deployment
   - [ ] MongoDB Replica Set
   - [ ] MinIO distributed mode
   - [ ] Horizontal Pod Autoscaler

6. **DevOps**
   - [ ] CI/CD pipeline (GitHub Actions)
   - [ ] Testes automatizados (Jest, Pytest)
   - [ ] Docker images otimizadas (multi-stage builds)
   - [ ] Backup automático de volumes

### Prioridade Baixa (Nice to Have)

7. **UX/UI**
   - [ ] Tutoriais interativos
   - [ ] Dark mode
   - [ ] Keyboard shortcuts
   - [ ] Drag-and-drop melhorado
   - [ ] Animações suaves

8. **AI Avançado**
   - [ ] Style transfer (transferência de estilo)
   - [ ] Face detection e blur
   - [ ] Auto-colorization
   - [ ] Image inpainting (remover objetos)
   - [ ] Video editing (extensão futura)

9. **Business**
   - [ ] Sistema de afiliados
   - [ ] API pública para developers
   - [ ] Webhooks para integrações
   - [ ] Analytics dashboard para admins

---

## 🎓 Conceitos Técnicos Aprendidos

### 1. **Arquitetura de Microserviços**
- Separação de responsabilidades
- Desacoplamento via Message Queue
- Comunicação assíncrona
- Service discovery

### 2. **Message-Driven Architecture**
- Producer-Consumer pattern
- Queue vs Topic
- Acknowledge vs Reject
- Dead Letter Queue

### 3. **Event-Driven Real-Time**
- WebSocket bidirecional
- Server-sent events
- Pub/Sub pattern
- Room-based messaging

### 4. **Container Orchestration**
- Docker Compose
- Service dependencies
- Health checks
- Volume management
- Networking (bridge, overlay)

### 5. **API Gateway Pattern**
- Single entry point
- Authentication/Authorization
- Request routing
- Rate limiting
- Response caching

### 6. **Storage Patterns**
- Object storage (S3-compatible)
- Presigned URLs
- Bucket management
- CDN integration

### 7. **Authentication & Authorization**
- JWT tokens
- Stateless authentication
- Role-based access control (RBAC)
- Token refresh strategies

---

## 📊 Estatísticas do Projeto

### Linhas de Código (Aproximado)
```
Frontend (TypeScript/React):    ~8,000 linhas
Backend (Node.js):               ~5,000 linhas
Processing Tools (Python):       ~3,000 linhas
Configuração (Docker/Nginx):     ~1,000 linhas
────────────────────────────────────────────
Total:                          ~17,000 linhas
```

### Componentes
```
Microserviços:           8
Processing Tools:        14
Bases de Dados:          3 (MongoDB instances)
Message Queues:          15+ filas
Docker Containers:       25+
REST Endpoints:          ~50
WebSocket Events:        ~10
```

### Performance Esperada
```
Upload de imagem:        < 2s (10MB)
Processamento simples:   < 3s (brightness, contrast)
Processamento AI:        5-15s (background removal)
Throughput:              ~100 jobs/min (com 5 workers)
```

---

## 🧪 Como Testar

### 1. **Teste Manual (UI)**

```bash
# 1. Iniciar sistema
docker compose up

# 2. Abrir browser
http://localhost:8080

# 3. Criar conta
Email: teste@example.com
Password: senha123

# 4. Criar projeto
Nome: "Teste Editor"

# 5. Upload imagem
Drag & drop ou clique

# 6. Testar ferramentas
- Brightness: Slider +50
- Contrast: Slider +30
- Rotate: 90°
- Download resultado
```

### 2. **Teste API (Postman/cURL)**

```bash
# Login
curl -X POST http://localhost:8000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"senha123"}'

# Resposta
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "email": "..." }
}

# Criar projeto (com token)
curl -X POST http://localhost:8000/projects \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test Project"}'

# Upload imagem
curl -X POST http://localhost:8000/projects/<PROJECT_ID>/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "image=@foto.jpg"
```

### 3. **Teste RabbitMQ**

```bash
# Aceder Management UI
http://localhost:15672
User: user
Pass: password

# Verificar:
- Queues: brightness_queue, contrast_queue, etc.
- Messages: Quantidade em fila
- Consumers: Workers conectados
```

### 4. **Teste MinIO**

```bash
# Aceder Console
http://localhost:9090
User: admin
Pass: admin123

# Verificar:
- Buckets: picturas-images
- Objects: Imagens carregadas
```

### 5. **Teste WebSocket**

```javascript
// Browser Console
const socket = io('http://localhost:4000', {
  auth: { token: '<JWT_TOKEN>' }
});

socket.on('connect', () => {
  console.log('Conectado!');
});

socket.on('preview-ready', (url) => {
  console.log('Preview pronto:', url);
});
```

---

## 🆘 Troubleshooting

### Problema: Containers não iniciam

```bash
# Ver logs
docker compose logs <service_name>

# Exemplos
docker compose logs rabbitmq
docker compose logs projects

# Reconstruir
docker compose up --build --force-recreate
```

### Problema: RabbitMQ não conecta

```bash
# Verificar health
docker compose ps

# Se unhealthy
docker compose restart rabbitmq

# Aguardar 30s até status healthy
```

### Problema: Frontend não carrega

```bash
# Verificar se Nginx está up
docker compose ps nginx

# Verificar configuração
docker exec -it <nginx_container> cat /etc/nginx/nginx.conf

# Reiniciar Nginx
docker compose restart nginx
```

### Problema: Imagens não processam

```bash
# 1. Verificar se tool está running
docker compose ps | grep tool

# 2. Ver logs do tool
docker compose logs brightness_tool

# 3. Verificar RabbitMQ queue
# Aceder http://localhost:15672 → Queues

# 4. Verificar MinIO
# Aceder http://localhost:9090 → Buckets
```

### Problema: MongoDB connection error

```bash
# Verificar se MongoDB está pronto
docker compose ps | grep mongo

# Aguardar healthcheck
docker compose logs users_mongoDB

# Reiniciar serviço dependente
docker compose restart users
```

---

## 📚 Recursos Adicionais

### Documentação Oficial
- [Next.js](https://nextjs.org/docs)
- [Express.js](https://expressjs.com/)
- [RabbitMQ](https://www.rabbitmq.com/documentation.html)
- [MongoDB](https://docs.mongodb.com/)
- [MinIO](https://min.io/docs/)
- [Docker](https://docs.docker.com/)
- [Socket.IO](https://socket.io/docs/)

### Tutoriais Relevantes
- Microservices Architecture
- JWT Authentication
- Message Queue Patterns
- WebSocket Real-Time Communication
- Docker Compose Orchestration

---

## 👥 Autores

**Grupo A** - Universidade do Minho (2024/2025)

- PG55926 - Carlos Alberto Ribeiro
- PG55932 - Diogo Cardoso Ferreira
- PG55934 - Diogo Gomes Matos
- PG55946 - Guilherme João Fernandes Barbosa
- PG57558 - João Henrique Costa Ferreira
- PG55958 - João Manuel Matos Fernandes
- PG55969 - José Filipe Ribeiro Rodrigues
- PG55973 - Juciano Gomes Farias Junior
- PG55989 - Nuno Ricardo Silva Gomes

_Curricular Unit: Requisitos e Arquiteturas de Software_

---

## 📄 Licença

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** (CC BY-NC-SA 4.0)

✅ Partilhar e adaptar
✅ Dar crédito aos autores
❌ Uso comercial sem autorização
✅ Distribuir sob mesma licença

---

## 🎉 Conclusão

PictuRAS é um **projeto educacional completo** que demonstra:
- ✅ Arquitetura de microserviços moderna
- ✅ Comunicação assíncrona com Message Queue
- ✅ Real-time updates com WebSocket
- ✅ Integração de IA em pipeline de processamento
- ✅ Containerização e orquestração com Docker
- ✅ API Gateway pattern
- ✅ Authentication & Authorization
- ✅ Separação Frontend/Backend

**Ideal para aprender:**
- Microservices Architecture
- Event-Driven Systems
- Container Orchestration
- Full-stack Development
- DevOps practices

---

**Boa sorte com as melhorias! 🚀**

Se tiveres dúvidas sobre qualquer componente, consulta esta documentação ou explora o código-fonte.

*"Code is poetry, architecture is art, and PictuRAS is a masterpiece of learning."* ✨
