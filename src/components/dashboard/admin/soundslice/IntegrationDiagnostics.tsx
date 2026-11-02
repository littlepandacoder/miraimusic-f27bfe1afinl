import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

interface DiagnosticsProps {
  iframeLoaded: boolean;
  apiConnected: boolean;
  midiSupported: boolean;
  midiConnected: boolean;
  checkpointsEnabled: boolean;
  checkpointCount: number;
}

export const IntegrationDiagnostics = ({
  iframeLoaded,
  apiConnected,
  midiSupported,
  midiConnected,
  checkpointsEnabled,
  checkpointCount,
}: DiagnosticsProps) => {
  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
            Active
          </Badge>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <AlertCircle className="w-4 h-4 text-gray-400" />
        <Badge variant="outline">Inactive</Badge>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-500" />
          System Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Soundslice Player */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-sm">🎼 Soundslice Player</p>
              <p className="text-xs text-muted-foreground">Embedded iframe status</p>
            </div>
            {getStatusBadge(iframeLoaded)}
          </div>

          {/* API Connection */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-sm">📡 Soundslice API</p>
              <p className="text-xs text-muted-foreground">JavaScript API communication</p>
            </div>
            {getStatusBadge(apiConnected)}
          </div>

          {/* MIDI Support */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-sm">🎹 Web MIDI Support</p>
              <p className="text-xs text-muted-foreground">Browser API availability</p>
            </div>
            {getStatusBadge(midiSupported)}
            {!midiSupported && (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
          </div>

          {/* MIDI Connection */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-sm">🎛️ MIDI Device</p>
              <p className="text-xs text-muted-foreground">Physical keyboard connected</p>
            </div>
            {getStatusBadge(midiConnected)}
          </div>

          {/* Checkpoints */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-sm">🎯 Checkpoint Testing</p>
              <p className="text-xs text-muted-foreground">
                {checkpointCount} checkpoint{checkpointCount !== 1 ? "s" : ""} configured
              </p>
            </div>
            {getStatusBadge(checkpointsEnabled && checkpointCount > 0)}
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-2">Integration Health:</p>
            <div className="space-y-1">
              {iframeLoaded && apiConnected ? (
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Soundslice player is ready for interactive lessons
                </p>
              ) : (
                <p className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-yellow-600" />
                  Soundslice player is initializing...
                </p>
              )}

              {midiSupported && midiConnected ? (
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  MIDI keyboard is connected and ready
                </p>
              ) : midiSupported ? (
                <p className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-yellow-600" />
                  Connect a MIDI keyboard to enable checkpoint testing
                </p>
              ) : (
                <p className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  Web MIDI not supported in your browser
                </p>
              )}

              {checkpointsEnabled && checkpointCount > 0 ? (
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Checkpoint testing is active with {checkpointCount} checkpoint{checkpointCount !== 1 ? "s" : ""}
                </p>
              ) : (
                <p className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-yellow-600" />
                  Add checkpoints to enable MIDI-gated playback
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
