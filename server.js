const express = require("express");
const session = require("express-session");
const path = require("path");
const Database = require("better-sqlite3");
const QRCode = require("qrcode");
require("dotenv").config();

const app = express();
const db = new Database(process.env.DB_FILE || "momos.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, mobile TEXT NOT NULL,
 type TEXT NOT NULL, address TEXT, payment TEXT NOT NULL,
 payment_ref TEXT, items TEXT NOT NULL, total INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'Order Received', created_at TEXT NOT NULL
);
`);

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-secret",
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", maxAge:86400000}
}));
app.use(express.static(path.join(__dirname,"public")));

function admin(req,res,next){ if(req.session.admin) return next(); res.status(401).json({error:"Admin login required"}); }

app.get("/api/config",(req,res)=>res.json({
  shopName:"Momo's Corner",
  upiId:process.env.UPI_ID || "",
  payeeName:process.env.UPI_NAME || "Momo's Corner"
}));

app.post("/api/orders", async (req,res)=>{
  const {name,mobile,type,address,payment,paymentRef,items,total}=req.body;
  if(!name || !/^\d{10}$/.test(mobile) || !Array.isArray(items) || !items.length || !Number.isFinite(total))
    return res.status(400).json({error:"Invalid order details"});
  if(type==="Home Delivery" && !address) return res.status(400).json({error:"Delivery address required"});
  const id="MC"+Math.floor(100000+Math.random()*900000);
  db.prepare(`INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,name,mobile,type,address||"",payment,paymentRef||"",JSON.stringify(items),total,"Order Received",new Date().toISOString()
  );
  res.json({id,status:"Order Received"});
});

app.get("/api/orders/:id",(req,res)=>{
  const o=db.prepare("SELECT id,name,type,payment,total,status,created_at FROM orders WHERE id=?").get(req.params.id);
  if(!o) return res.status(404).json({error:"Order not found"});
  res.json(o);
});

app.post("/api/admin/login",(req,res)=>{
  const {username,password}=req.body;
  if(username===process.env.ADMIN_USER && password===process.env.ADMIN_PASSWORD){
    req.session.admin=true; return res.json({ok:true});
  }
  res.status(401).json({error:"Invalid admin credentials"});
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/me",(req,res)=>res.json({loggedIn:!!req.session.admin}));

app.get("/api/admin/orders",admin,(req,res)=>{
  res.json(db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all().map(o=>({...o,items:JSON.parse(o.items)})));
});
app.patch("/api/admin/orders/:id",admin,(req,res)=>{
  const allowed=["Order Received","Preparing","Ready","Out for Delivery","Delivered","Cancelled"];
  if(!allowed.includes(req.body.status)) return res.status(400).json({error:"Invalid status"});
  db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status,req.params.id);
  res.json({ok:true});
});

app.get("/api/upi-qr",async(req,res)=>{
  const amount=Number(req.query.amount||0);
  const id=process.env.UPI_ID;
  if(!id) return res.status(503).json({error:"UPI_ID is not configured"});
  const url=`upi://pay?pa=${encodeURIComponent(id)}&pn=${encodeURIComponent(process.env.UPI_NAME||"Momo's Corner")}&am=${amount.toFixed(2)}&cu=INR`;
  res.type("png").send(await QRCode.toBuffer(url,{width:420,margin:2}));
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Momo's Corner running on port ${port}`));
