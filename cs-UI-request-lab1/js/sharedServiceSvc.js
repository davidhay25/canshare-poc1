
//a shared service to send data between directives
angular.module('formsApp').factory('sharedService', function() {
    var sharedObject = {};

    return {
        getSharedObject: function() {
            return sharedObject;
        },
        setSharedObject: function(obj) {
            sharedObject = obj;
        }
    };
});
