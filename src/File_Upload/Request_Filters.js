/**
 * @module File_Upload/Request_Filters
 */
const multer = require("multer")
const path = require("path")
/** 
* Filters out all files that don't match the specifications of the subjectkey. If a file
* does not match the allowed specifications, it is added to the failed files object and filtered out
* It takes in the req as well as a file and a callback. This is a part of the multer middleware. 
* If a file fails, false is passed into the callback otherwise true is. 
* @param {Object} req - request object
* @param {Object} file - Multer file object
* @param {Function} cb - callback
*/
async function File_Filter(req, file, cb){
    let state=req.app.locals.fileInformation
    // case when file name is not already in the endpoint
    if (! Object.keys(state[file.fieldname].files).includes(file.originalname)){
        if (state[file.fieldname].scope.fileCount+1>state[file.fieldname].scope.maxFiles){
            req.app.locals.failedFiles[file.originalname]=`More files uploaded to endpoint ${file.fieldname} than current slots are available`
        }
        else{
            state[file.fieldname].files[file.originalname]={updateCount:0}
            state[file.fieldname].scope.fileCount+=1
        }
    }
    // case when file name is in the endpoint
    else{
        if (state[file.fieldname].files[file.originalname].updateCount+1>state[file.fieldname].scope.maxFileUpdates){
            req.app.locals.failedFiles[file.originalname]="More updates attempted on file than provisioned"
        }
        else{
            state[file.fieldname].files[file.originalname].updateCount+=1
        }
    }
    if (! state[file.fieldname].scope.fileTypes.includes(path.extname(file.originalname))){
        req.app.locals.failedFiles[file.originalname]="Different file extension was provided than the provisioned types."
    }
    if(Object.keys(req.app.locals.failedFiles).includes(file.originalname)){
        cb(null,false)
    }
    else{
        cb(null,true)
    }


}
/** 
* Verify_Uploaded_Files functions as the main middleware for file uploading. It limits the file size
* by the specified amount in the generator key in req.app.locals, as well as the number of 
* files accepted. Triggers the next middleware, which in this case is just the function at /Upload.
* If an error is detected in the multer middleware, the response is terminated with 401.
* @param {Object} req - request object
* @param {Object} res - response object
* @param {Function} cb - callback function
*/
async function Verify_Uploaded_Files(req, res, cb){
    let stateFiles=req.app.locals.fileInformation
    let uploadKeys=Object.keys(stateFiles)
    let globalLimit=Math.max(...uploadKeys.map((key)=>{return To_Byte_Size(stateFiles[key].scope.maxFileSize)}))
    var handler=multer({
        fileFilter: File_Filter, 
        limits:{fileSize:globalLimit}
    }).fields(Build_Array_Of_Field_Objs(req))
    try{
        handler(req,res,(e)=>{
            if (e instanceof multer.MulterError){
                res.status(401).send()
            }
            else{
                cb()
            }})
    }
    catch(e){
        res.sendStatus(401)
        res.end()
        return false
    }
}
/**
* Helper function for the multer filter. Takes in the request object and uses the 
* locals object to build and return all the avaible upload field names with their
* max number of file uploads.
* @param {Object} req - request object
*/
function Build_Array_Of_Field_Objs(req){
    let state=req.app.locals.fileInformation
    let stateKeys=Object.keys(state)
    return stateKeys.map((key)=>{return {name:key,maxCount:state[key].scope.maxFiles}})
}
/** 
* A middleware function that checks if the file objects have file sizes under the allowed 
* amount given by their respective endpoints. If the file is too large, it is added to 
* the failedFiles object and is filtered out of the available files. Takes in the req, 
* and res objects as well as a callback function for the next middleware. Must follow the 
* Verify_Uploaded_Files middleware.
* @param {Object} req - request object
* @param {Object} res - response object
* @param {Function} cb - callback function
*/
async function Filter_By_Size(req,res,cb){
    let state=req.app.locals.fileInformation
    for (const [key, value] of Object.entries(req.files)){
        req.files[key]=value.filter((file)=>{
            if (file.size>To_Byte_Size(state[key].scope.maxFileSize)){
                req.app.locals.failedFiles[file.originalname]=`Size exceeded of provisioned limit of endpoint ${file.fieldname} with file ${file.originalname} `
                return false
            }
            else{
                return true
            }
        })
    }
    cb()
}
/**
* To_Byte_Size converts a string representing a byte size in MB,TB,KB or MB. It 
* returns an integer that is the number of bytes of that input.
* @param {string} inputSize - byte size string
*/
function To_Byte_Size(inputSize){
    let binarySplit=inputSize.split(/(?<=[0-9])(?=[TtGgBbMmKk])/)
    let byteTypes=[[/[Tt][Bb]/,4],[/[Gb][Bb]/,3],[/[Mm][Bb]/,2],[/[Kk][Bb]/,1]]
    for (var i=0;i<byteTypes.length;i++){
        if (byteTypes[i][0].test(binarySplit[1])){
            return parseInt(binarySplit[0])*(2**(10*byteTypes[i][1]))
        }
    }
    return parseInt(inputSize)
}
module.exports={
    Verify_Uploaded_Files,
    Filter_By_Size
}