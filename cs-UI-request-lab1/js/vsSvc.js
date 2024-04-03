angular.module("pocApp")

    .service('vsSvc', function() {

        let cache = {}

        function fixUrlDEP(url) {
            if (url.indexOf('http' == -1)) {
                url = ``
            }
        }

        return {
            fixUrl(url) {
                if (url.indexOf('http') == -1) {
                    url = "https://nzhts.digital.health.nz/fhir/ValueSet/" + url
                }
                return url
            },
            setVSContents : function(hash) {
                //set the cache to a hash of concepts
                let that = this

                Object.keys(hash).forEach(function (url) {
                    let url1 = that.fixUrl(url)

                    cache[url1] = hash[url]
                })


            },
            getOneVS : function (url) {
                //get the contents for a single vs
                let url1 = this.fixUrl(url)

                return cache[url1]
            }
        }

    })