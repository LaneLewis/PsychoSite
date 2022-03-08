
/**
 * @module File_Upload/Upload_Files
 */
const express=require("express")
var router =express.Router()
const {Authenticate} =require("./Authenticate")
const { Verify_Uploaded_Files, Filter_By_Size } = require("./Request_Filters")
const {Update_Subject_Key} = require("../Subject_Key/Subject_Key_Base")
const {Upload_File,Update_File} = require("../Box/Write_File_To_Box")
/**
 * Checks files attempted to be uploaded, and then uploads them if they pass.
 * If the user passes authentication checks and a file fails they will be given 
 * information on why it failed. 
 * @function
 * @name POST/Upload/
 * @memberof API
 */
router.post("/",[Authenticate,Verify_Uploaded_Files,Filter_By_Size],async function (request, response){
    let verifiedFiles=request.files
    let fileInformation=request.app.locals.fileInformation
    let subjectKeyData=request.app.locals.subjectKeyData
    let failedFiles=request.app.locals.failedFiles
    for (const [key,value] of Object.entries(verifiedFiles)){
        newFile=await Promise.all(value.map(File_To_Box,{fileInformation:fileInformation,failedFiles:failedFiles,subjectKeyData:subjectKeyData}))
    }
    subjectKeyData["uploadState"]=fileInformation
    try{
        Update_Subject_Key(`${request.app.locals.keys.relayName}`,subjectKeyData)
        response.setHeader('Access-Control-Allow-Origin', "*");
        response.setHeader('Content-Type', 'application/json');
        response.json({"failedFiles":failedFiles})
    }
    catch(e){
        response.json({"internal":"failed To completely update file"})
    }
})
/**
 * Takes in a multer file object and attempts to upload it to box. Needs to have
 * fileInformation, failedFiles, subjectKeyData attatched to this at function call.
 * @param {Object} file - multer file object
 */
async function File_To_Box(file){
    // add subjectKeyData ability to add file ids
    if (! Object.keys(this.fileInformation[file.fieldname].files[file.originalname]).includes("fileId")){
        let fileId=await Upload_File(file.buffer,this.fileInformation[file.fieldname].scope.boxFolderId,file.originalname)
        if (fileId){
            this.fileInformation[file.fieldname].files[file.originalname]["fileId"]=fileId
            return true
        }
        else{
            this.failedFiles[file.originalname]=`File ${file.originalname} failed to upload to box`
            return false
        }
    }
    else{
        return (await Update_File(file.buffer,this.fileInformation[file.fieldname].files[file.originalname]["fileId"]))
    }
}

module.exports = {File_Upload:router}