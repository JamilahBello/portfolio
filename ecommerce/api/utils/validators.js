exports.validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

exports.validatePassword = (password) => {
  return password.length >= 6;
};

exports.validateNigerianPhone = (phone) => {
  return /^0\d{10}$/.test(phone);
};

exports.validateUserLoginInput = (user) => {
  const errors = {};

  if (!user.email || !exports.validateEmail(user.email)) {
    errors.email = 'Invalid email address';
  }

  if (!user.password || !exports.validatePassword(user.password)) {
    errors.password = 'Password must be at least 6 characters long';
  }

  if (!user.phone || !exports.validateNigerianPhone(user.phone)) {
    errors.phone = 'Invalid Nigerian phone number.';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

exports.validateEmailInput = (data) => {
  const errors = {};

  if (!data.to || !exports.validateEmail(data.to)) {
    errors.to = 'Invalid email address';
  }

  if (!data.subject || typeof data.subject !== 'string') {
    errors.subject = 'Subject is required';
  }

  if (!data.body || typeof data.body !== 'string') {
    errors.body = 'Body is required';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
