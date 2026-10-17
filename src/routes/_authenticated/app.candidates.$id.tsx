import {createFileRoute} from '@tanstack/react-router';
import {CandidateDetailPage} from '@/features/candidates/CandidateDetailPage';
import {detailQuery,optionsQuery} from '@/features/candidates/queries';
import {candidateHead} from '@/lib/candidates/head';
export const Route=createFileRoute('/_authenticated/app/candidates/$id')({head:()=>candidateHead('Candidate 360°','Candidate overview, staff assignment, portal access and activity in CareerOS.'),loader:({context,params})=>Promise.all([context.queryClient.ensureQueryData(detailQuery(params.id)),context.queryClient.ensureQueryData(optionsQuery)]),component:Page});
function Page(){const {id}=Route.useParams();return <CandidateDetailPage id={id}/>;}
