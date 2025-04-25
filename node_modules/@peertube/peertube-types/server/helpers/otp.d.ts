declare function isOTPValid(options: {
    encryptedSecret: string;
    token: string;
}): Promise<boolean>;
declare function generateOTPSecret(email: string): {
    secret: string;
    uri: string;
};
export { isOTPValid, generateOTPSecret };
//# sourceMappingURL=otp.d.ts.map