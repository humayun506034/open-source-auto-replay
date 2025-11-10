// import express from "express";
// import bodyParser from "body-parser";
// import TwilioPkg from "twilio";  // CommonJS module import

// const { twiml: Twiml } = TwilioPkg; // ESM compatible way

// const app = express();
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());



// const users = {}; 
// // structure: { "+8801xxxxxxx": { step: 1, budget: null, rooms: null } }

// app.post("/webhook", (req, res) => {
//   const from = req.body.From;
//   const body = req.body.Body?.trim().toLowerCase() || "";

//   console.log("Message from:", from);
//   console.log("Message body:", body);

//   const twiml = new Twiml.MessagingResponse();

//   // If user types "clear", reset their state
//   if (body === "clear") {
//     delete users[from];
//     twiml.message("Your data has been cleared. Let's start over!");
//     return res.writeHead(200, { "Content-Type": "text/xml" }) && res.end(twiml.toString());
//   }

//   // Initialize user if not exists
//   if (!users[from]) {
//     users[from] = { step: 1, budget: null, rooms: null };
//   }

//   const user = users[from];
//   if (user.step === 1) {
//     // First interaction
//     twiml.message("Hi there, thanks for your message! Enter your budget");
//     user.step = 2; // move to next step
//   } else if (user.step === 2) {
//     // Capture budget
//     user.budget = body;
//     twiml.message("Got it! Now please tell me how many rooms you need");
//     user.step = 3;
//   } else if (user.step === 3) {
//     // Capture number of rooms
//     user.rooms = body;
//     twiml.message(`Thanks! Your budget is ${user.budget} and rooms needed are ${user.rooms}. We are processing your request.`);
//     user.step = 4; // conversation complete
//     console.log("User state:", user);
//   } else {
//     // Default response after completion
//     twiml.message("We are already processing your request. Type 'clear' to start over.");
//   }

//   res.writeHead(200, { "Content-Type": "text/xml" });
//   res.end(twiml.toString());
// });


// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// // import express from "express";
// // import bodyParser from "body-parser";
// // import twilio from "twilio";

// // const app = express();
// // app.use(bodyParser.urlencoded({ extended: false }));
// // app.use(bodyParser.json());

// // // Twilio credentials (from your Twilio dashboard)
// // const accountSid = ""; // 👉 তোমার Twilio account SID এখানে দাও
// // const authToken = "";   // 👉 তোমার Twilio Auth Token এখানে দাও

// // const client = twilio(accountSid, authToken);

// // // Webhook route for incoming messages
// // app.post("/webhook", async (req, res) => {
// //   const from = req.body.From;
// //   const body = req.body.Body || "";

// //   console.log("📩 Message from:", from);
// //   console.log("💬 Message body:", body);

// //   try {
// //     // Send reply message
// //     const message = await client.messages.create({
// //       from: "whatsapp:+14155238886", // 👉 Twilio WhatsApp number
// //       to: from, // user’s number
// //       body: "Hello! 👋 Thanks for your message. This is an auto reply.",
// //     });

// //     console.log("✅ Reply sent:", message.sid);
// //   } catch (error) {
// //     console.error("❌ Error sending message:", error);
// //   }

// //   res.sendStatus(200);
// // });

// // // Start server
// // app.listen(3000, () => {
// //   console.log("🚀 Server running on port 3000");
// // });



import express from "express";
import mongoose from "mongoose";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

// MongoDB connect
await mongoose.connect("mongodb+srv://mongoDB_Compass:Ru8CJHOeVEMTSQil@cluster0.uij78.mongodb.net/Yaneyamba?retryWrites=true&w=majority&appName=Cluster0");
console.log("✅ MongoDB connected!");

// Schema
const userSchema = new mongoose.Schema({
  number: String,
  budget: String,
  rooms: String
});
const User = mongoose.model("User", userSchema);

// ------------------- WhatsApp Bot -------------------
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: false, // UI দেখাবে
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

client.on("qr", (qr) => {
  console.log("\n📱 Scan this QR code with your phone:\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => console.log("✅ WhatsApp Bot is ready!"));

client.on("message", async (msg) => {
  const number = msg.from;
  const text = msg.body.trim().toLowerCase();

  if (text === "clear") {
    await User.deleteOne({ number });
    return msg.reply("🧹 Your data has been cleared. Start again!");
  }

  let user = await User.findOne({ number });

  if (!user) {
    user = new User({ number });
    await user.save();
    return msg.reply("👋 Hi! Please enter your budget:");
  }

  if (!user.budget) {
    user.budget = text;
    await user.save();
    return msg.reply("✅ Got it! How many rooms do you need?");
  }

  if (!user.rooms) {
    user.rooms = text;
    await user.save();
    return msg.reply(
      `🏡 Thanks! Your budget: ${user.budget}, Rooms: ${user.rooms}`
    );
  }

  return msg.reply("✅ We already have your info! Type 'clear' to start over.");
});

client.initialize();

// ------------------- Express API -------------------
const app = express();
app.use(express.json());

// Postman থেকে পাঠানোর জন্য endpoint
app.post("/send-message", async (req, res) => {
  const { number, message } = req.body;
  try {
    await client.sendMessage(number, message);
    res.json({ success: true, message: "Message sent successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------- Server -------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));