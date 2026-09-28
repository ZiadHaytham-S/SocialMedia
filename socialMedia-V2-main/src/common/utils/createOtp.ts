
export const createOtp = async()=>{
return Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
}