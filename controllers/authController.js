const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');
const sendEmail = require('../Utils/email.js');
const { appendFile } = require('fs');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookiesOption = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') cookiesOptions.secure = true;

  res.cookie('jwt', token, cookiesOption);

  //remove password  from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'sucess',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await user.create(req.body);
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) checar se email e senha existem
  if (!email || !password) {
    return next(new AppError('please provide email and password', 400));
  }

  //2)checar se user existe e password esta correto
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('incorrect email or password', 401));
  }

  //3) se tudo esta ok, enviar token pro client
  createSendToken(user, 200, res);
  const token = signToken(user._id);

  res.status(200).json({
    status: ' sucess',
    token
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1)obter token e verificar se ele existe
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];

    if (!token) {
      return next(
        new AppError('you are not logged in! please log in to get acess.', 401)
      );
    }
  }

  //2) validar o token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) verificar se usuario existe ainda

  const correntUser = await User.findById(decoded.id);
  if (!correntUser) {
    return next(
      new AppError('the user beloging to this token does no longer exist.', 401)
    );
  }

  //4) verificar se usuário trocou password após token ser emitido
  if (correntUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! please log in again.', 401)
    );
  }

  //grant  acess to protected route
  req.user = correntUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles ['admin, lead-guide']. role= user
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('you do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)get user based on Posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('there is no user with email adress.', 404));
  }
  //2)generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3)send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `forgot your password? Submit a PATCH request with your new password and  passwordConfirm to: ${resetURL}.\nIf you didn t forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'your password reset token(valid for 10 min)',
      message
    });
    res.status(200).json({
      status: 'sucess',
      message: 'token sent to email'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'there was an error sending the email. try again later!',
        500
      )
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .uptade(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  //2) if token has not expired, and there is user exist, set the new password
  if (!user) {
    return next(new AppError('token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  //3) uptade changedPasswordAt property for the user

  //4) log the user in, send JWT
  const token = signToken(user._id);

  res.status(200).json({
    status: ' sucess',
    token
  });
});

module.exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) get user from collection
  const user = await User.findById(req.user.id).select('+password');

  //2) check if Posted current password is correct
  if (!(await user.correctPassword(req.body.passwordConfirm, user.password))) {
    return next(new AppError('your current password is wrong.', 401));
  }
  //3)If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4) log user in, send JWT
  createSendToken(user, 200, res);
});
