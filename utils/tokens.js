import jwt from 'jsonwebtoken';

export function signAccessToken({ userId, role }) {
    return jwt.sign(
        { sub: userId, role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' }
    )
}

export function signRefreshToken({ userId, role }) {
    return jwt.sign(
        { sub: userId, role },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
    )
}

export function verifyRefreshToken(token) {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
}

export function refreshCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    }
}
// export function refreshCookieOptions() {
//   const isProd = process.env.NODE_ENV === "production";

//   return {
//     httpOnly: true,
//     secure: isProd,                 // ✅ false locally, true in prod
//     sameSite: isProd ? "none" : "lax", // ✅ supports cross-site prod deployments
//     path: "/",                      // ✅ IMPORTANT (so middleware can read)
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   };
// }
