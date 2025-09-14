import fetch from "node-fetch";

import cron from "node-cron";
import "dotenv/config";
import express from "express";


const app = express();
const PORT = process.env.PORT || 3000;
const URL=process.env.URL
if (!URL) {
  console.warn("URL not set in environment variables.");
}

if (!process.env.PORT) {
  console.warn("PORT not set in environment variables. Using default port 3000.");
}


async function login() {
  try {
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
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        username: "O24BCA110121",
        email: null,
        password: "YGP54A"
      }),
      method: "POST"
    });

    console.log("Status:", res.status);
    console.log("Response text:", await res.text());

  } catch (err) {
    console.error("Error:", err);
  }
}


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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});








// Schedule at 10:00 AM IST daily
cron.schedule("0 10 * * *", () => {
  console.log("Running login at 10:00 AM IST...");
  login();
}, {
  timezone: "Asia/Kolkata"
});

login();