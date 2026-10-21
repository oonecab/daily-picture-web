// Only public JSON files on GitHub are consumed; download_url is never followed.
export async function githubFile({repository,ref,path,upstream}) {
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !/^[A-Za-z0-9_/-]+$/.test(ref)
    || !/^[A-Za-z0-9_/-]+\.json$/.test(path) || path.includes('..'))throw new Error('Invalid GitHub source');
  const deadline=AbortSignal.timeout(20000);
  try {
    return {...await upstream(new URL(`https://raw.githubusercontent.com/${repository}/${ref}/${path}`),1024*1024,
      AbortSignal.any([deadline,AbortSignal.timeout(8000)])),transport:'raw'};
  }catch(error){
    const transient=error instanceof TypeError || ['TimeoutError','AbortError'].includes(error.name)
      || error.upstreamStatus>=500 || [408,429].includes(error.upstreamStatus);
    if(!transient || error.status===503 || deadline.aborted)throw error;
    const url=new URL(`https://api.github.com/repos/${repository}/contents/${path}`);
    url.searchParams.set('ref',ref);
    const {bytes}=await upstream(url,1024*1024,deadline);
    const file=JSON.parse(bytes.toString('utf8'));
    if(file.type!=='file' || file.encoding!=='base64' || file.path!==path || typeof file.content!=='string'
      || !Number.isInteger(file.size) || file.size<0 || file.size>1024*1024)throw new Error('GitHub 文件响应无效。');
    const content=Buffer.from(file.content,'base64');
    if(content.length!==file.size)throw new Error('GitHub 文件长度无效。');
    return {bytes:content,transport:'github-api'};
  }
}
