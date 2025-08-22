exports.sanitizeUser = (user) => {
  if (!user) return null;

  const { password, __v, ...rest } = user.toObject ? user.toObject() : user;
  return rest;
}

exports.sanitizeEmail = (email) => {
  if (!email) return null;

  const { __v, ...rest } = email.toObject ? email.toObject() : email;
  return rest;
};
