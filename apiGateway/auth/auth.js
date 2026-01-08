const jwt = require("jsonwebtoken");

module.exports.checkToken = (req, res, next) => {
  const token = req.headers["authorization"].split(" ")[1];

  if (token === null || token === undefined) {
    res.status(401).jsonp(`Please provide a JWT token`);
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (e, payload) => {
    if (e) {
      res.status(401).jsonp(`Invalid JWT signature or token expired.`);
      return;
    }

    try {
      const user = payload;
      const user_id = user.id;
      const exp = user.exp;

      if (Date.now() >= exp * 1000) {
        res.status(401).jsonp(`JWT expired.`);
        return;
      }

      if (user_id !== req.params.user) {
        res.status(401).jsonp(`Request's user and JWT's user don't match`);
        return;
      }

      next();
    } catch (_) {
      res.status(401).jsonp(`Invalid JWT`);
    }
  });
};

// Optional authentication - allows requests with or without token
// If token is provided and valid, req.user will be set
// If no token or invalid token, request continues without user info
module.exports.optionalToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  
  // No token provided - continue without authentication
  if (!authHeader || !authHeader.includes("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];

  // Token provided - try to verify it
  jwt.verify(token, process.env.JWT_SECRET_KEY, (e, payload) => {
    if (e) {
      // Invalid token - continue without authentication
      req.user = null;
      return next();
    }

    try {
      const user = payload;
      const exp = user.exp;

      if (Date.now() >= exp * 1000) {
        // Expired token - continue without authentication
        req.user = null;
        return next();
      }

      // Valid token - set user info
      req.user = {
        id: user.id,
        email: user.email,
      };
      next();
    } catch (_) {
      // Invalid token format - continue without authentication
      req.user = null;
      next();
    }
  });
};


module.exports.checkProjectTokenOrUser =  (req,res,next)=>{
  const tokenProject =req.body.token;
  
  if(!tokenProject){
    return  this.checkToken(req,res,next)
  }
  if(!tokenProject.length===32){
    return res.status(401).jsonp("Invalid project token");
  }
  req.tokenProject=tokenProject;
  next();
}

