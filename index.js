

import fetch from "node-fetch";
import cron from "node-cron";
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import fs from "fs/promises";

import "dotenv/config";
import { log } from "console";


// ESM __dirname and __filename workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const PORT = process.env.PORT || 3000;
const URL=process.env.URL
const whatsapp_api_key=process.env.WHATSAPP_API_KEY
if (!whatsapp_api_key) {
  console.warn("WHATSAPP_API_KEY not set in environment variables.");
}

if (!URL) {
  console.warn("URL not set in environment variables.");
}

if (!process.env.PORT) {
  console.warn("PORT not set in environment variables. Using default port 3000.");
}




// ...existing code...

// Set up EJS view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

// In-memory user store: [{ username, password, time }]
let users = [];
const scheduledJobs = {};

const USERS_FILE = path.join(__dirname, "users.json");

// Load users from file at startup
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf-8");
    users = JSON.parse(data);
    users.forEach(u => scheduleUserJob(u));
  } catch (e) {
    users = [];
  }
}
loadUsers();

// Save users to file
async function saveUsers() {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Render UI
app.get("/", (req, res) => {
  res.render("index", { message: null, error: null });
});

// Handle form submission
app.post("/add-user", async (req, res) => {
  const { name, whatsapp, username, password, time } = req.body;
  if (!name || !whatsapp || !username || !password || !time) {
    return res.render("index", { message: null, error: "All fields are required." });
  }
  // Check for duplicate
  if (users.find(u => u.username === username)) {
    return res.render("index", { message: null, error: "User already scheduled." });
  }
  const user = { name, whatsapp, username, password, time };
  users.push(user);
  await saveUsers();
  scheduleUserJob(user);
  res.render("index", { message: "Attendance scheduled for " + username, error: null });
});
// Route to get all users as JSON
app.get("/users", async (req, res) => {
  try {
    const data = await fs.readFile(USERS_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: "Could not read users file" });
  }
});

// Health endpoint
app.get("/health", (req, res) => {
  res.status(200).send({
    status: "UP",
    message: "Subhodeep's automatic attendance bot is running 24/7. For more info, visit <a href='https://subhodeep.tech' target='_blank'>https://subhodeep.tech</a>"
  });
});

// Schedule a cron job to hit the /health endpoint every 13 minutes
cron.schedule("*/13 * * * *", async () => {
  try {
    const res = await fetch(`${URL}/health`);
    console.log("Health check status:", res.status);
    console.log("Health check response:", await res.json());
  } catch (err) {
    console.error("Error during health check:", err);
  }
});

// Login function with dynamic credentials
async function login({ name, whatsapp, username, password }) {
  try {
    console.log(`Running login for user: ${username}, password: ${password}`);
    const res = await fetch("https://pedagogy.cuonlineedu.in/api/v1/auth/login", {
      headers: {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "priority": "u=1, i",
        "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Linux\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "Referer": "https://lms.cuonlineedu.in/",
        "Origin": "https://lms.cuonlineedu.in",
      },
      body: JSON.stringify({
        username,
        email: null,
        password
      }),
      method: "POST"
    });
    const responseText = await res.text();
    console.log(`[${username}] Status:`, res.status);
    console.log(`[${username}] Response text:`, responseText);

  // Send WhatsApp message via CallMeBot
  await sendCallMeBotWhatsapp(whatsapp, `Hi ${name}, your attendance for username ${username} is done.`);
  } catch (err) {
    console.error(`[${username}] Error:`, err);
  }
}


// Send WhatsApp message using CallMeBot
async function sendCallMeBotWhatsapp(phone, message) {
  try {
    const apiKey = '7572720';
    // Ensure phone is in international format, e.g. +918597722752
    let phoneNumber = phone.startsWith('+') ? phone : `+91${phone}`;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phoneNumber)}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;  const response = await fetch(url);
    const text = await response.text();
    if (!response.ok) {
      console.error(`[CallMeBot] Error sending message:`, text);
    } else {
      console.log(`[CallMeBot] Message sent to ${phoneNumber}:`, text);
    }
  } catch (error) {
    console.error('[CallMeBot] Error sending message:', error);
  }
}

// Schedule a cron job for a user
function scheduleUserJob({ name, whatsapp, username, password, time }) {
  // time: "HH:MM"
  const [h, m] = time.split(":").map(Number);
  const cronTime = `${m} ${h} * * *`;
  // Remove previous job if exists
  if (scheduledJobs[username]) {
    scheduledJobs[username].stop();
  }
  scheduledJobs[username] = cron.schedule(cronTime, () => {
    console.log(`Running login for ${username} at ${h}:${m.toString().padStart(2, '0')} IST...`);
    login({ name, whatsapp, username, password });
  }, {
    timezone: "Asia/Kolkata"
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});