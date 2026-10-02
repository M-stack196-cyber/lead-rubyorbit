import path from 'path'

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT,
  )
}

export function getLeadUploadStoragePath(folder) {
  const baseDir = isServerlessRuntime() ? '/tmp/uploads' : path.resolve('uploads')
  return path.join(baseDir, folder)
}
