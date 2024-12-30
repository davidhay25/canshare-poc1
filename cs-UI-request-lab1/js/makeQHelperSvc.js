angular.module("pocApp")

    .service('makeQHelperSvc', function(orderingSvc,utilsSvc,qHelperSvc) {

        return {
            addExtension : function (item,ext) {
                item.extension = item.extension || []
                item.extension.push(ext)
            },
            checkParentalHash : function (hash,path) {
                //ensure that all segments in the path have an entry in the hash
                //and that the 'parent' path (one less segment) has a .item that references the entry
                let ar = path.split('.')

               // let first = ar.splice(0,1)      //remove the first segment
                //ar.splice(ar.length-1,1)        //and we don't need the last segment (it's the one we're cheching the parent for)...
                let first = ar[0]
                hash[first] = hash[first] || {}

                for (let i = 1;i < ar.length -1; i++) {
                    let path = makePath(ar,i)
                    if (! hash[path]) {
                        hash[path] = {placeHolder:true,linkId:pathSoFar}
                        let parentPath = makePath(ar,i-1)

                        hash[parentPath].item = hash[parentPath].item || []
                        let t = hash[parentPath]
                        hash[arentPath].item.push(t)

                        console.log(`added ${pathSoFar}`)
                    }

                }

                let pathSoFar = first[0]
                for (const segment of ar) {
                    //will start with the second segment
                    if (! hash[pathSoFar]) {
                        hash[pathSoFar] = {placeHolder:true,linkId:pathSoFar}
                        console.log(`added ${pathSoFar}`)
                    }
                    pathSoFar += '.' + segment
                }

                function makePath(ar,length) {
                    let path = ""
                    for (let i = 0;i < length; i++) {
                        path += `.${ar[i]}`
                    }
                    return path.splice(1)   //split off the leading '.'

                }

            }

        }

    })