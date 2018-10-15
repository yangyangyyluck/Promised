# Promised
an implement of Promise with ES6. this project is just help me understand Promise more deeply.

以阮一峰老师的ES6教程( http://es6.ruanyifeng.com/#docs/promise )为基准实现的Promise。  
我对其中Promise.try的实现还不太满意，暂时没想到更好的实现方式，先这样吧。  

继承至Function是为了重写toString()  
class Promised extends Function {  
	...  
}  

实现的API  
Promised.prototype.then()  
Promised.prototype.catch()  
Promised.prototype.finally()  
Promised.prototype.try()  
Promised.all()  
Promised.race()  
Promised.resolve()  
Promised.reject()  

特别注意, Promised.prototype.try() 需要的入参必须是Function类型  
假设目标操作是内部包含异步流程的函数asyncFn(arg),则需要包裹一层  
function(){  
	return asyncFun(arg)  
}  