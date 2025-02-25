class ApiResponse {
    constructor(statusCode, data, message = "Request Successful") {
        this.data = data;
        this.message = message;
        this.statusCode = statusCode;
        this.success = statusCode < 400;
    }
}

export { ApiResponse }