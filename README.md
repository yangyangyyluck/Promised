# Promised
an implement of Promise with ES6.  

APIs  
Promised.prototype.then()  
Promised.prototype.catch()  
Promised.prototype.finally()    
Promised.all()  
Promised.race()  
Promised.resolve()  
Promised.reject()  
Promised.try()   
// Promised.try处理的函数
// 1.目标函数同步throw error
// 2.异步逻辑包装在Promised中，返回该promised
function getUserById(id) {
    return Promise.try(function() {
        if (typeof id !== "number") {
            throw new Error("id must be a number");
        }
        // return promised
        return db.getUserById(id);
    });
}