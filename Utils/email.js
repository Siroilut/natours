const nodemailer = require('nodemailer');
const  options  = require('../routes/tourRoutes');

const sendEmail = async options => {
  //1) create a transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      password: process.env.EMAIL_PASSWORD
    }
  });

  // 2) define the email options
  const mailOptions = {
    from: 'nome do email <email>',
    to: options.email,
    subject: options.subject,
    text: options.message
    // html:
  };

  // 3) actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
