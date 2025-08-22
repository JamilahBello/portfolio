const ONE_DAY = 60 * 60 * 24;

const isProd = process.env.NODE_ENV === "production";

const defaultCookieOpts = {
    httpOnly: true, // <-- this is what your test expects
    sameSite: isProd ? "strict" : "lax",
    secure: isProd, // true only in production
    maxAge: ONE_DAY * 1000, // ms
    path: "/",
};

exports.setAuthCookie = (res, token, opts = {}) => {
    res.cookie("token", token, { ...defaultCookieOpts, ...opts });
};

exports.clearAuthCookie = (res) => {
    res.clearCookie("token", { ...defaultCookieOpts, maxAge: 0 });
};
