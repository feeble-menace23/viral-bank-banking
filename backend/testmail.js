const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'saket314159@gmail.com',
    pass: 'lgda dgxf bnnl npgt '
  }
});

let mailOptions = {
  from: 'saket314159@gmail.com',
  to: 'skate314159@gmail.com',
  subject: 'Test Email from ViralBank',
  text: 'This is a test email from your banking app.'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log('Error:', error);
  }
  console.log('Email sent:', info.response);
}); 