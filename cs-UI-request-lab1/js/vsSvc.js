angular.module("pocApp")

    .service('vsSvc', function(cmSvc,utilsSvc) {

        //cache of all vs. rebuilt each time the app runs. todo: could load into persistent browser cache like conceptmap stuff
        let cache = {}


        return {
            getAllVS : function(allElements, cb) {
                let that = this
            //return
            //a function that will get all of the valuesets in the list of elements and populate a hash cache
            // - like the concept map does. This will be memory intensive (may need to re-factor) but the intent
            //is to be able to avoid the async stuff

            let lst = []

            allElements.forEach(function (item) {
                if (item.ed && item.ed.valueSet) {

                    let vs = item.ed.valueSet
                    vs = that.fixUrl(vs)            //adds the NXHTS prefix if missing

                    if (lst.indexOf(vs) == -1 && ! cache[vs]) {    //only add once!
                        lst.push(vs)
                    }

                }
            })


            cmSvc.getVSContentsHash(lst).then(
                function (hash) {
                    //console.log(hash)
                    that.setVSContents(hash)
                    //hashVS = hash


                    let size1 = utilsSvc.getSizeOfObject(hash)
                    console.log(`Size of retrieved VS: ${size1/1024} K`)
                    lst.forEach(function (vs) {
                        console.log(" " + vs)
                    })

                    let size2 = utilsSvc.getSizeOfObject(cache)
                    console.log(`Size of full VS cache: ${size2/1024} K`)

                    cb()
                }
            )

            //code from conceptmap stuff



            console.log('getting VS')

        },

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