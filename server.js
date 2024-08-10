const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

// Access your API key as an environment variable (see "Set up your API key" above)
console.log(process.env.API_KEY);
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function getDetailsOfStudent(usn) {
  const readData = JSON.parse(
    fs.readFileSync("./studentdata.json", { encoding: "utf-8" })
  );
  const resData = readData.find((ele) => ele.USN === usn.toLocaleUpperCase());
  // console.log(resData);
  return resData;
}

const getDetailsOfStudentDeclaration = {
  name: "getDetails",
  parameters: {
    type: "OBJECT",
    description:
      "Get the details of a particular student based on USN, which is a unique value.",
    properties: {
      usn: {
        type: "STRING",
        description: "The usn of the student to get the details",
      },
    },
    required: ["usn"],
  },
};

const functions = {
  getDetails: ({ usn }) => {
    return getDetailsOfStudent(usn);
  },
};

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  tools: {
    functionDeclarations: [getDetailsOfStudentDeclaration],
  },
});

const chat = model.startChat();

async function feedPrompt(usn = "1MP22CS031") {
  const prompt = "Give me details of myself? My usn is " + usn;
  const result = await chat.sendMessage(prompt);
  const call = result.response.functionCalls()[0];
  if (call) {
    const apiResponse = await functions[call.name](call.args);
    const result2 = await chat.sendMessage([
      {
        functionResponse: {
          name: "getDetails",
          response: apiResponse,
        },
      },
    ]);
    console.log(result2.response.text());
  }
}

async function run(message, usn) {
  await feedPrompt();
  // const stName = process.argv.slice(2).join(" ");
  // console.log(stName);
  const prompt = message + " .My usn is " + usn;
  const result = await chat.sendMessage(prompt);
  console.log(result);
  console.log(result.response.functionCalls());
  const call = result.response.functionCalls()[0];
  if (call) {
    const apiResponse = await functions[call.name](call.args);
    const result2 = await chat.sendMessage([
      {
        functionResponse: {
          name: "getDetails",
          response: apiResponse,
        },
      },
    ]);
    console.log(result2.response.text());
    return result2.response.text();
  }
}

const express = require("express");

const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");

app.use(express.json()); // Middleware to parse JSON payloads
app.use(cors());

app.post("/get-role", async (req, res) => {
  const { userEmail, message } = req.body;
  console.log(
    `Received request - userEmail: ${userEmail}, message: ${message}`
  );

  if (!userEmail || !message) {
    console.error("Invalid request payload: Missing userEmail or message");
    return res.status(400).json({ error: "Invalid request payload" });
  }

  try {
    console.log("Fetching data");
    const responseStr = await run(message, userEmail);
    if (responseStr == undefined || responseStr == null) {
      throw new Error("Invaild Answer!");
    }
    res.json({ response: responseStr });
  } catch (error) {
    return res.status(400).json({ error: error });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
