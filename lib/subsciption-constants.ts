
export const getCurrentBillingPeriodStart = () =>{
    const now = new Date()
    return (now.getFullYear() , now.getMonth() , 1 , 0 , 0 , 0 , 0);
}

