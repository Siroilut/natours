const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    maxlength: 20,
    required: [true, 'please tell us your name']
  },
  email: {
    type: String,
    required: [true, 'please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'please provide a validate email']
  },
  photo: String, 
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'please provide a password'],
    minlength: 8,
    Selection: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'please provide a password'],
    validate: {
      //this only a create and save
      validator: function(el) {
        return el === this.password;
      },
      message: 'password are not the same'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active:{
    type: Boolean,
    default: true,
    select: false,
  }
});

userSchema.pre('save', async function(next) {
  if (!this.modified('password')) return next();

  (this.password = await bcrypt.hash(this.password, 12)),
    (this.passwordConfirm = undefined);
  next();
});

userSchema.pre('save', function(next){
  if(!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next){
  //this point to the current query
  this.find({active: {$ne: false}}),
  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassaword
) {
  return await bcrypt.compare(candidatePassword, userPassaword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp){
  if(this.passwordChangedAt){
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    
   
    return JWTTimestamp < changedTimestamp;
    }
  
  return false;
};


 userSchema.methods.createPasswordResetToken = function (){
  const resetToken = crypto.randomBytes(32).toString('hex');

  console.log({resetToken}, this.passwordResetToken);

  this.passwordResetToken = crypto.createHash('sha32').uptade(resetToken).digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;
