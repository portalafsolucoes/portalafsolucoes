import { supabase } from '@/lib/supabase'

type ResolveJobTitleInput = {
  companyId: string
  jobTitleId?: string | null
  jobTitle?: string | null
}

type ResolvedJobTitle = {
  jobTitleId: string | null
  jobTitle: string | null
}

export async function resolveJobTitleSelection({
  companyId,
  jobTitleId,
  jobTitle,
}: ResolveJobTitleInput): Promise<ResolvedJobTitle> {
  const trimmedJobTitle = jobTitle?.trim() || null

  if (jobTitleId) {
    const { data, error } = await supabase
      .from('JobTitle')
      .select('id, name')
      .eq('id', jobTitleId)
      .eq('companyId', companyId)
      .maybeSingle()

    if (error || !data) {
      throw new Error('INVALID_JOB_TITLE')
    }

    return {
      jobTitleId: data.id,
      jobTitle: data.name,
    }
  }

  if (trimmedJobTitle) {
    const { data } = await supabase
      .from('JobTitle')
      .select('id, name')
      .eq('companyId', companyId)
      .eq('name', trimmedJobTitle)
      .maybeSingle()

    return {
      jobTitleId: data?.id || null,
      jobTitle: trimmedJobTitle,
    }
  }

  return {
    jobTitleId: null,
    jobTitle: null,
  }
}
