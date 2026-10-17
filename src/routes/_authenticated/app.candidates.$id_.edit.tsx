import {CandidateError} from '@/features/candidates/CandidateError';
import {createFileRoute} from '@tanstack/react-router';
import {useSuspenseQuery} from '@tanstack/react-query';
import {CandidateEditor} from '@/features/candidates/CandidateEditor';
import {detailQuery,optionsQuery} from '@/features/candidates/queries';
import {requirePermission} from '@/lib/auth/guards';
import {candidateHead} from '@/lib/candidates/head';
export const Route=createFileRoute('/_authenticated/app/candidates/$id_/edit')({beforeLoad:requirePermission('candidates.edit'),head:()=>candidateHead('Edit Candidate','Update candidate personal, education, employment and program information in CareerOS.'),loader:({context,params})=>Promise.all([context.queryClient.ensureQueryData(detailQuery(params.id)),context.queryClient.ensureQueryData(optionsQuery)]),errorComponent:CandidateError,component:Page});
function Page(){const {id}=Route.useParams();const {data}=useSuspenseQuery(detailQuery(id));return <CandidateEditor detail={data}/>;}
