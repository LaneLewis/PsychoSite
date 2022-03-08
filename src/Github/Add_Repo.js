
const ADMIN_KEY = process.env.ADMIN_GIT_KEY
var {Octokit} = require('@octokit/rest')

const octoInst = new Octokit({
    auth: ADMIN_KEY
})
async function listOrgRepos({org,type="all"}){
    try{
        let orgInfo = await octoInst.repos.listForOrg({org,type})
        let orgNameList = orgInfo.data.map(x=>x.name)
        return orgNameList
    }
    catch(e){
        return e.status
    }
}
async function doesRepoExist({org,repo}){
    const orgRepos = await listOrgRepos({org})
    return orgRepos.includes(repo)
}
async function makeRepo({org,name,auto_init=true}){
    try{
        return await octoInst.repos.createInOrg({org,name,auto_init})
    }
    catch(e){
        return e.status
    }
}
async function makeIntoPages({org,repo,branch}){
    try{
        let repo_status = await octoInst.repos.createPagesSite({owner:org,repo,source:{branch,path:"/"}})
        return repo_status.status
    }
    catch(e){
        return e.status
    }
}
async function makeNewExperimentRepo({org,name}){
    try{
        if (!await doesRepoExist({org,repo:name})){
            await makeRepo({org,name})
            await makeIntoPages({org,repo:name,branch:"main"})
            return true
        }
        else{
            return false
        }
    }
    catch(e){
        return false
    }
   
}
module.exports = {makeNewExperimentRepo:makeNewExperimentRepo}
