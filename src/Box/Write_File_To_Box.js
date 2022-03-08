/**
 * @module Box/Write_File_To_Box
 */
const BoxSDK = require('box-node-sdk');
var jsonConfig = require('./box_config.json');
var sdk = BoxSDK.getPreconfiguredInstance(jsonConfig);
const client= sdk.getAppAuthClient('enterprise');
/** 
 * Takes in a buffer or stream and uploads it to the box account
 * at the folder specified by folderId and with the name given by fileName. 
 * If successful, the id of the entry is returned. Otherwise an error is thrown
 * @param {Buffer|ReadableStream} buffer - a byte stream or buffer to upload to box
 * @param {string} folderId - folder id to upload buffer to 
 * @param {string} fileName - file name to assign to the buffer
*/
async function Upload_File(buffer, folderId,fileName){
	try{
		let fileUploaded=await client.files.uploadFile(folderId,fileName,buffer)
		return fileUploaded.entries[0].id
	}
	catch(e){
		throw Error("File Failed to Upload")
	}
}
/**
 *Takes in a buffer/stream and a fileId, it then updates the
* file corresponding to the fileId. returns true if the file is updated
* without issue. Otherwise an error is thrown.
* @param {Buffer|ReadableStream} buffer - a byte stream or buffer to upload to box	
* @param {string} fileId - file id to update
*/
async function Update_File(buffer, fileId){
	try{
		await client.files.uploadNewFileVersion(fileId,buffer)
		return true
	}
	catch(e){
		console.log(e)
		throw Error("File Failed to Update")
	}
}

module.exports={
	Upload_File,
	Update_File
}