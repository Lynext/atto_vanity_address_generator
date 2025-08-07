import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle, Target, Loader, Download, Hash, Clock } from 'lucide-react';

const ResultDisplay = ({ result, isGenerating }) => {
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (copiedField) {
      const timer = setTimeout(() => setCopiedField(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedField]);

  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedField(fieldName);
    }
  };

  const downloadResult = () => {
    if (!result) return;

    const content = 
      `ATTO Vanity Address Generator Result\n` +
      `=====================================\n\n` +
      `Target Pattern: ${result.targetString}\n` +
      `Search Type: ${result.searchType}\n` +
      `Generated Address: ${result.address}\n\n` +
      `Mnemonic Phrase: ${result.mnemonic}\n\n` +
      `Statistics:\n` +
      `- Attempts: ${result.attempts.toLocaleString()}\n` +
      `- Time Elapsed: ${result.timeElapsed.toFixed(2)} seconds\n` +
      `- Attempts per Second: ${result.attemptsPerSecond === Infinity ? 'Infinity' : Math.round(result.attemptsPerSecond).toLocaleString()}\n\n` +
      `Generated on: ${new Date().toISOString()}\n\n` +
      `IMPORTANT: Keep your mnemonic phrase secure and private!\n` +
      `This phrase can be used to recover your ATTO wallet.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atto-vanity-${result.targetString}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const highlightTargetString = (address, targetString, searchType) => {
    if (!targetString || !address) return address;
    
    // Handle wildcards by converting to regex pattern
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = targetString.replace(/\*/g, '.*');
    const regex = new RegExp(`(${escapeRegex(pattern).replace(/\\\.\*/g, '.*')})`, 'i');
    
    let searchAddress = address;
    
    // For 'start' search type, ignore first 2 characters
    if (searchType === 'start') {
      searchAddress = address.substring(2);
      const match = searchAddress.match(regex);
      if (match && searchAddress.indexOf(match[1]) === 0) {
        const matchedPart = match[1];
        const beforeMatch = address.substring(0, 2);
        const afterMatch = address.substring(2 + matchedPart.length);
        return (
          <>
            {beforeMatch}
            <span className="bg-yellow-200 px-1 rounded">{matchedPart}</span>
            {afterMatch}
          </>
        );
      }
    } else {
      const match = address.match(regex);
      if (match) {
        const matchedPart = match[1];
        const matchIndex = address.indexOf(matchedPart);
        const beforeMatch = address.substring(0, matchIndex);
        const afterMatch = address.substring(matchIndex + matchedPart.length);
        return (
          <>
            {beforeMatch}
            <span className="bg-yellow-200 px-1 rounded">{matchedPart}</span>
            {afterMatch}
          </>
        );
      }
    }
    
    return address;
  };

  const CopyButton = ({ text, fieldName, className = "" }) => (
    <button
      onClick={() => copyToClipboard(text, fieldName)}
      className={`p-2 text-gray-500 hover:text-gray-700 transition-colors ${className}`}
      title={`Copy ${fieldName}`}
    >
      {copiedField === fieldName ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );

  if (!result && !isGenerating) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Results</h2>
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No Results Yet</h3>
          <p className="text-gray-400">
            Start generating a vanity address to see results here.
          </p>
        </div>
      </div>
    );
  }

  if (isGenerating && !result) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Results</h2>
        <div className="text-center py-12">
          <Loader className="w-16 h-16 text-atto-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Generating...</h3>
          <p className="text-gray-500">
            Searching for your vanity address pattern.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Results</h2>
        <button
          onClick={downloadResult}
          className="btn-secondary flex items-center"
          title="Download result as text file"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
              <div>
                <h3 className="font-medium text-green-800">Vanity Address Found!</h3>
                <p className="text-sm text-green-600">
                  Found matching pattern after {result.attempts.toLocaleString()} attempts
                </p>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              ATTO Address
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm break-all">
                {highlightTargetString(result.address, result.targetString, result.searchType)}
              </div>
              <CopyButton text={result.address} fieldName="address" />
            </div>
          </div>

          {/* Mnemonic */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Mnemonic Phrase
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex items-start space-x-2">
              <div className="flex-1 p-3 bg-red-50 border border-red-200 rounded-lg font-mono text-sm">
                {result.mnemonic}
              </div>
              <CopyButton text={result.mnemonic} fieldName="mnemonic" className="mt-1" />
            </div>
            <p className="text-xs text-red-600">
              * Keep this phrase secure and private! It can be used to recover your wallet.
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Hash className="w-5 h-5 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">Attempts</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {result.attempts.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                {result.attemptsPerSecond === Infinity ? 'Infinity' : Math.round(result.attemptsPerSecond).toLocaleString()} attempts/sec
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Clock className="w-5 h-5 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">Time Elapsed</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatTime(result.timeElapsed)}
              </div>
              <div className="text-xs text-gray-500">
                {result.timeElapsed.toFixed(2)} seconds
              </div>
            </div>
          </div>

          {/* Pattern Info */}
          <div className="p-4 bg-atto-50 border border-atto-200 rounded-lg">
            <h4 className="font-medium text-atto-800 mb-2">Pattern Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-atto-600 font-medium">Target:</span>
                <span className="ml-2 font-mono">{result.targetString}</span>
              </div>
              <div>
                <span className="text-atto-600 font-medium">Type:</span>
                <span className="ml-2 capitalize">{result.searchType}</span>
              </div>
            </div>
          </div>

          {/* Copy Status */}
          {copiedField && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-sm text-green-700">
                  {copiedField === 'address' ? 'Address' : 'Mnemonic'} copied to clipboard!
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;