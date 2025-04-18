// class ApiError extends Error{
//     constructor (
//         statusCode,
//         message ="Something went wrong !!",
//         errors= [],
//         statck=""
//     ){
//         super(message)
//         this.statusCode = statusCode
//         this.data = null
//         this.message = message
//         this.success= false;
//         this.errors= errors
// if(statck){
//     this.statck= statck
// }else{
//     Error.captureStackTrace(this, this.constructure)

//     }

//   }
// }

// export {ApiError}

class ApiError extends Error {
    constructor(statusCode, message = "Something went wrong!", errors = [], stack = "") {
      super(message);
  
      this.statusCode = statusCode;
      this.message = message;
      this.errors = errors;
      this.success = false;
      this.data = null;
  
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  export { ApiError }; // ✅ Named export
  