const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite = require("sqlite3");
const bcrypt = require("bcrypt");
const dbPath = path.join(__dirname, "userData.db");

const app = express();
app.use(express.json());
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost/3000");
    });
  } catch (e) {
    console.log(`DB:Error ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//register create user API

app.post("/register", async (request, response) => {
  let { username, name, password, gender, location } = request.body;
  let hashedPassword = await bcrypt.hash(password, 10);
  let checkTheUserName = `
  SELECT
  *
  FROM 
  user
  WHERE
  username = '${username}';`;
  let userData = await db.get(checkTheUserName);
  if (userData === undefined) {
    let createUserQuery = `
      INSERT INTO 
      user (username,name,password,gender,location)
      VALUES
      (
          '${username}',
          '${name}',
          '${hashedPassword}',
          '${gender}',
          '${location}'
       );`;
    // password less than 5
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      //If password length is greater than 5
      let newUserDetails = await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//login user API
app.post("/login", async (request, response) => {
  let { username, password } = request.body;
  let selectUserQuery = `
    SELECT
    * FROM 
    user
    WHERE username = '${username}';`;
  let dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//user change password  API

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `
    SELECT * FROM user
    WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidOldPassword = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isValidOldPassword === true) {
      const newPasswordLength = newPassword.length;
      if (newPasswordLength < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
                UPDATE user 
                SET password = '${encryptedPassword}'
                WHERE username = '${username}';`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
