/**
 * @module Github/Github_Authorization
 */
const {Octokit}=require("@octokit/core")
const adminKey = process.env.ADMIN_GIT_KEY
const org = process.env.GIT_ORG
/** 
* Checks to see if a user is part of an organization.
* Returns true if the user is in the org
* and false otherwise.
* @param {String} orgName - name of organization to search through
* @param {String} userKey - github key to check
*/
async function Is_User_Valid(orgName,userKey){
    let orgArray=await Get_User_Orgs(userKey)
    if (orgArray.includes(orgName)){
        return true
    }
    return false
}
/**
 * Takes a github access key and gets all the organizations that
 * user is a member of. Returns an array of all the orgs they are in.
 * @param {String} userKey
 */
async function Get_User_Orgs(userKey){
    const octokit=new Octokit({auth:userKey})
    try{
        let userOrgs = (await octokit.request(`GET /user/orgs`)).data
        let userOrgsFiltered=userOrgs.map(x=>x.login)
        return userOrgsFiltered
    }
    catch(e){
        return []
        }
}

/**
 * Takes in an organization, a github key with admin permissions to the org, 
 * and a username to check the status of. If the user is in the
 * org, it returns their role as a string.
 * @param {String} org - organization name
 * @param {String} adminKey - github key with admin permissions in org
 * @param {String} username - github username to check
 */
async function Get_Member_Status(org,adminKey,username){
    const octokit=new Octokit({auth:adminKey})
    try{
        let userPermissions=await octokit.request('GET /orgs/{org}/memberships/{username}', {
            org: org,
            username: username
          })
        return userPermissions.data.role
    }
    catch(e){
        throw Error("Error in getting member status")
    }
}
/** 
 * Returns the username associated with the github key passed. If a username
 * is not able to be grabbed, an error is thrown
 * @param {String} userKey - github key
 */
async function Get_Username(userKey){
    const octokit = new Octokit({auth:userKey})
    try{
        let userData = await octokit.request("GET /user")
        return userData.data.login
    }
    catch(e){
        throw Error("Error in getting member username")
    }
}
/**
 * Takes in a user's github key and checks if the user is in the organization
 * within a set of specific statuses. Returns true if this is the case and false
 * otherwise.
 * @param {String} userKey - github key
 * @param {Array<String>} allowedStatus - statuses that are ok 
 */
async function Is_User_In_Org(userKey,allowedStatus=["member","admin"]){
    try{
        let username=await Get_Username(userKey)
        let userStatus=await Get_Member_Status(org,adminKey,username)
        if (allowedStatus.includes(userStatus)){
            return true
        }
        else{
            return false
        }
    }
    catch(e){
        throw Error("Error in retrieving status")
    }
}
/**
 * Takes in a user's github key, a repository, and a set of allowed permissions. If 
 * the user has at least one of the allowed permissions to the repository, true
 * is returned else false
 * @param {String} userKey - github key
 * @param {String} repo - repository name
 * @param {Array<String>} allowedPermissions - permissions to check if the user has
 */
async function Does_User_Have_Repository_Access(userKey,repo,allowedPermissions=["pull","push","admin"]){
    try{
        let username=await Get_Username(userKey)
        const octokit = new Octokit({auth:adminKey})
        let collaboratorData=await octokit.request('GET /repos/{owner}/{repo}/collaborators', {
            owner: org,
            repo: repo
          })
        collaboratorObj={}
        let logins=collaboratorData.data.map((data)=>{collaboratorObj[String(data.login)]=data.permissions})
        console.log(collaboratorObj)
        console.log(username)
        if (Object.keys(collaboratorObj).includes(username)){
            let permissionGranted=allowedPermissions.some((permission)=>collaboratorObj[username][permission])
            if (permissionGranted){
                return true
            }else{
                return false
            }
        }
        return false
    }
    catch(e){
        throw Error(`Issue in determining if user has access to repository: ${repo}`)
    }
}
module.exports={
    Is_User_Valid,
    Does_User_Have_Repository_Access,
    Is_User_In_Org
}