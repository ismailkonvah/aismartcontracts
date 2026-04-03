import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { AuditSummary } from '@/types/audit';
import { 
  AlertTriangle, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldX,
  Bug,
  Skull,
  AlertOctagon
} from 'lucide-react';

interface RiskDashboardProps {
  summary: AuditSummary;
}

export function RiskDashboard({ summary }: RiskDashboardProps) {
  const getRiskIcon = () => {
    switch (summary.riskLevel) {
      case 'Safe':
        return <ShieldCheck className="w-12 h-12 text-green-500" />;
      case 'Moderate':
        return <ShieldAlert className="w-12 h-12 text-yellow-500" />;
      case 'Dangerous':
        return <ShieldX className="w-12 h-12 text-orange-500" />;
      case 'Critical':
        return <Skull className="w-12 h-12 text-red-500" />;
      default:
        return <Shield className="w-12 h-12 text-slate-500" />;
    }
  };

  const getRiskColor = () => {
    switch (summary.riskLevel) {
      case 'Safe':
        return 'text-green-500';
      case 'Moderate':
        return 'text-yellow-500';
      case 'Dangerous':
        return 'text-orange-500';
      case 'Critical':
        return 'text-red-500';
      default:
        return 'text-slate-500';
    }
  };

  const getRiskBgColor = () => {
    switch (summary.riskLevel) {
      case 'Safe':
        return 'bg-green-500/20 border-green-500/50';
      case 'Moderate':
        return 'bg-yellow-500/20 border-yellow-500/50';
      case 'Dangerous':
        return 'bg-orange-500/20 border-orange-500/50';
      case 'Critical':
        return 'bg-red-500/20 border-red-500/50';
      default:
        return 'bg-slate-500/20 border-slate-500/50';
    }
  };

  const getProgressColor = () => {
    switch (summary.riskLevel) {
      case 'Safe':
        return 'bg-green-500';
      case 'Moderate':
        return 'bg-yellow-500';
      case 'Dangerous':
        return 'bg-orange-500';
      case 'Critical':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-4">
      <Card className={`${getRiskBgColor()} border-2`}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              {getRiskIcon()}
              <div className="min-w-0">
                <h3 className={`text-xl font-bold sm:text-2xl ${getRiskColor()}`}>
                  {summary.riskLevel} GenLayer Risk
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Validator and deployment risk assessment
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className={`text-3xl font-bold sm:text-4xl ${getRiskColor()}`}>
                {summary.riskScore}
              </div>
              <p className="text-slate-400 text-sm">Risk Score</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            {summary.riskDescription}
          </p>
          <div className="mt-4">
            <Progress 
              value={summary.riskScore} 
              className="h-3 bg-slate-700"
            />
            <div 
              className="h-3 -mt-3 rounded-full transition-all"
              style={{ 
                width: `${summary.riskScore}%`,
                backgroundColor: getProgressColor().replace('bg-', '').replace('-500', ''),
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-red-950/30 border-red-800/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-xs font-medium uppercase tracking-wider">
                  Critical
                </p>
                <p className="text-2xl font-bold text-red-500 mt-1">
                  {summary.criticalCount}
                </p>
              </div>
              <Skull className="w-8 h-8 text-red-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-950/30 border-orange-800/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-400 text-xs font-medium uppercase tracking-wider">
                  High
                </p>
                <p className="text-2xl font-bold text-orange-500 mt-1">
                  {summary.highCount}
                </p>
              </div>
              <AlertOctagon className="w-8 h-8 text-orange-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-950/30 border-yellow-800/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-xs font-medium uppercase tracking-wider">
                  Medium
                </p>
                <p className="text-2xl font-bold text-yellow-500 mt-1">
                  {summary.mediumCount}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-950/30 border-green-800/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-xs font-medium uppercase tracking-wider">
                  Low
                </p>
                <p className="text-2xl font-bold text-green-500 mt-1">
                  {summary.lowCount}
                </p>
              </div>
              <Bug className="w-8 h-8 text-green-600/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">
            GenLayer Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-slate-700 text-slate-300">
              Total Findings: {summary.totalIssues}
            </Badge>
            {summary.criticalCount > 0 && (
              <Badge className="bg-red-600 text-white">
                {summary.criticalCount} Critical
              </Badge>
            )}
            {summary.highCount > 0 && (
              <Badge className="bg-orange-500 text-white">
                {summary.highCount} High
              </Badge>
            )}
            {summary.mediumCount > 0 && (
              <Badge className="bg-yellow-500 text-black">
                {summary.mediumCount} Medium
              </Badge>
            )}
            {summary.lowCount > 0 && (
              <Badge className="bg-green-500 text-white">
                {summary.lowCount} Low
              </Badge>
            )}
            {summary.totalIssues === 0 && (
              <Badge className="bg-green-600 text-white">
                No findings detected
              </Badge>
            )}
          </div>
          {summary.topConcerns.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Top Concerns
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.topConcerns.map((concern) => (
                  <Badge
                    key={concern}
                    variant="secondary"
                    className="bg-slate-700 text-slate-200 whitespace-normal break-words"
                  >
                    {concern}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
