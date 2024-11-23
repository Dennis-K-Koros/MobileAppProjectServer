const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User/user');
const UserVerification = require('../models/User/userVerification');
const PasswordReset = require('../models/User/passwordReset');
const nodemailer = require("nodemailer");
const {v4: uuidv4} = require("uuid");
require("dotenv").config();
const path = require("path");

//nodemailer stuff
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
      user: process.env.AUTH_EMAIL,
      pass: process.env.AUTH_PASS,
  }
});

//testing success
transporter.verify((error, success) => {
  if(error){
      console.log(error);
  }else{
      console.log("Ready for messages");
      console.log(success);
  }
});

// setting server url
const development = "http://localhost:5000/";
const production = "https://mobileappprojectserver.onrender.com";
const currentUrl = process.env.NODE_ENV ? production : development;

// Helper function for validation
const validateUserInput = ({ username, email, password }) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!username || !/^[a-zA-Z\-'\s]*$/.test(username)) {
    return 'Invalid username entered';
  }
  if (!email || !emailRegex.test(email)) {
    return 'Invalid email entered';
  }
  if (!password || !passwordRegex.test(password)) {
    return 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
  }
  return null;
};

router.post('/signup', async (req, res) => {
  try {
    const { username, email, phone, password, image, role, isTechnician } = req.body;

    // Validate input
    const validationError = validateUserInput({ username, email, password });
    if (validationError) {
      return res.status(400).json({ status: 'FAILED', message: validationError });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine role and isTechnician
    const userRole = role && role === 'technician' ? 'technician' : 'customer';
    const technicianStatus = isTechnician !== undefined ? Boolean(isTechnician) : userRole === 'technician';

    // Create a new user
    const newUser = new User({
      username,
      email,
      phone,
      password: hashedPassword,
      role: userRole,
      isTechnician: technicianStatus,
      verified: false,
      image,
    });

    await newUser.save()
      .then((result) => {
        // Send verification email and response
        sendVerificationEmail(result, res);
      })
      .catch((error) => {
        throw error; // Forward error to catch block
      });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});


//send verification email
const sendVerificationEmail = ({_id, email}, res) => {
  const uniqueString = uuidv4() + _id;
  
  //mail options
  const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify Your Email",
      html: `<p>Verify your email address to complete the signup and login into your account.</p><p>This link <b>expires in 6 hours</b>.</p><p>Press <a href= ${currentUrl + "user/verify/"+ _id +"/"+ uniqueString}> here</a> to proceed.</p>`,
  };

  // hash the uniquestring
  const saltRounds = 10;
  bcrypt
      .hash(uniqueString, saltRounds)
      .then((hashedUniqueString)=>{
          // set values in the userVerification collection
          const newVerification = new UserVerification({
              userId: _id,
              uniqueString: hashedUniqueString,
              createdAt: Date.now(),
              expiresAt: Date.now() + 21600000,
          });

          newVerification
              .save()
              .then(()=>{
                  transporter
                  .sendMail(mailOptions)
                  .then(()=>{
                      //email sent verification record saved
                      res.json({
                          status: "PENDING",
                          message: "Verification email sent",
                          data:{
                              userId: _id,
                              email,
                          }
                      });
                  })
                  .catch((error)=>{
                      console.log(error);
                      res.json({
                          status: "FAILED",
                          message: error.message,
                      }); 
                  })
              })
              .catch((error) =>{
                  console.log(error);
                  res.json({
                      status: "FAILED",
                      message: "Couldn't save verification email data!",
                  });
              })

      })
      .catch(()=>{
          res.json({
              status: "FAILED",
              message: "An error occurred while hashing email data!",
          });
      }
  );

};

//resend verification
router.post("/resendVerificationLink", async (req, res)=>{
  try {
   let { userId, email} = req.body;

   if(!userId || !email){
       throw Error("Empty user details are not allowed");
   }else{
       //delete existing records and resend
       await UserVerification.deleteMany({userId});
       sendVerificationEmail({_id: userId, email}, res);
   }
  } catch (error) {
       res.json({
           status: "FAILED",
           message: `Verification Link Resend Error. ${error.message}`,
       });
  }
});

//verify email
router.get("/verify/:userId/:uniqueString", (req,res)=>{
   let{userId, uniqueString} = req.params;

   UserVerification
       .find({userId})
       .then((result)=>{
           if(result.length > 0){
               //user verification record exists so we proceeed

               const {expiresAt} = result[0];
               const hashedUniqueString = result[0].uniqueString;

               if (expiresAt < Date.now()) {
                   // record has expired so we delete it
                   UserVerification
                       .deleteOne({ userId})
                       .then(result =>{
                           User
                               .deleteOne({_id: userId})
                               .then(()=>{
                                   let message = "Link has expired. Please sign up again.";
                                   res.redirect(`/user/verified/error=true&message=${message}`);
                               })
                               .catch((error)=>{
                                   let message = "Clearing User with Expired unique string failed";
                                   res.redirect(`/user/verified/error=true&message=${message}`);
                               })
                       })
                       .catch((error)=>{
                           console.log(error);
                           let message = "An error occurred while clearing expired user verification record";
                           res.redirect(`/user/verified/error=true&message=${message}`);
                       })
               }else{
                   // valid record exists so we validate the user string
                   //first compare the hashed unique string

                   bcrypt
                       .compare(uniqueString, hashedUniqueString)
                       .then(result =>{
                           if(result){
                               //strings match

                               User
                                   .updateOne({_id: userId}, {verified: true})
                                   .then(()=>{
                                       UserVerification.deleteOne({userId})
                                       .then(()=>{
                                           res.sendFile(path.join(__dirname,"./../views/verified.html"));
                                       })
                                       .catch(error =>{
                                           console.log(error);
                                           let message = "An error occurred while finalizing successful verification ";
                                           res.redirect(`/user/verified/error=true&message=${message}`);
                                       })
                                   })
                                   .catch(error =>{
                                       console.log(error);
                                       let message = "An error occurred while updating user record to show verified";
                                       res.redirect(`/user/verified/error=true&message=${message}`);
                                   })

                           }else{
                               //existing record but incorrect verification details passed
                               let message = "Invalid verification Details passed. Check your Inbox.";
                               res.redirect(`/user/verified/error=true&message=${message}`);
                           }
                       })
                       .catch(error =>{
                           let message = "An error occurred while comparing unique strings.";
                           res.redirect(`/user/verified/error=true&message=${message}`);
                       })

               }

           }else{
               // user verified record doesnt exist
               let message = "Account record doesn't exist or haas been verified already. Please sign up or log in.";
               res.redirect(`/user/verified/error=true&message=${message}`);
           }
       })
       .catch((error)=>{
           console.log(error);
           let message = "An error occurred while checking for existing user verification record";
           res.redirect(`/user/verified/error=true&message=${message}`);
       })
});

//verified page route
router.get("/verified", (req, res) => {
   res.sendFile(path.join(__dirname, "./../views/verified.html"));
})

//Sign in
router.post('/signin', (req,res)=>{
  let { email, password} = req.body;
  email = email.trim();
  password = password.trim();

  if(email == "" || password == ""){
       res.json({
           status: "FAILED",
           message: "Empty credentials supplied!"
       });
  }else{
     //check if user exists
     User.find({email}).then(data => {
       if(data.length){
           //user exists

           //check if user is verified
           if(!data[0].verified){
               res.json({
                   status: "FAILED",
                   message: "Email hasn't been verified yet. Check your inbox.",
                   data: data,
               });
           } else {
               const hashedPassword = data[0].password;
               bcrypt.compare(password, hashedPassword).then(result =>{
                   if(result){
                   //Password Match
                       res.json({
                           status: "SUCCESFUL",
                           message: "Signin successful",
                           data: data,
                       });
                   }else {
                       res.json({
                           status: "FAILED",
                           message: "Invalid password entered!"
                       });
                   }
               })
               .catch(err =>{
                   res.json({
                       status: "FAILED",
                       message: "An error occurred while comparing!"
                   });
               })
           }
       }else {
           res.json({
               status: "FAILED",
               message: "Invalid credentials entered!"
           });
       }
       
     })
     .catch(err =>{
           res.json({
               status: "FAILED",
               message: "An error occured while checking for existing user"
           });
     })
  }
});


// Get all users
router.get('/getUsers', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Get a user by ID
router.get('/getProfile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

router.put('/update/:id', async (req, res) => {
  try {
    const { username, email, phone, password, image } = req.body; 
    const updatedData = { username, email, phone, image };

    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});


// Delete a user
router.delete('/delete/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

module.exports = router;
