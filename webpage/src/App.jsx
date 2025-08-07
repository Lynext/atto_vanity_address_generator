import React, { useState } from 'react';
import { Search, Sparkles, Clock, Target } from 'lucide-react';
import VanityGenerator from './components/VanityGenerator.jsx';
import ResultDisplay from './components/ResultDisplay.jsx';

function App() {
  const [result, setResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleResult = (vanityResult) => {
    setResult(vanityResult);
    setIsGenerating(false);
  };

  const handleStartGeneration = () => {
    setIsGenerating(true);
    setResult(null);
  };

  const handleStopGeneration = () => {
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-atto-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-atto-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">
              ATTO Vanity Address Generator
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Generate custom ATTO addresses with your desired patterns. 
            Use wildcards (*) for flexible matching and choose where your pattern should appear.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <Target className="w-12 h-12 text-atto-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Pattern Matching</h3>
            <p className="text-gray-600">
              Choose if your pattern should start, contain, or end with your desired text
            </p>
          </div>
          <div className="card text-center">
            <Search className="w-12 h-12 text-atto-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Wildcard Support</h3>
            <p className="text-gray-600">
              Use * as wildcards to match any character in your pattern
            </p>
          </div>
          <div className="card text-center">
            <Clock className="w-12 h-12 text-atto-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Progress</h3>
            <p className="text-gray-600">
              Monitor generation progress with live statistics and performance metrics
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Generator */}
          <div className="card">
            <VanityGenerator
              onResult={handleResult}
              onStart={handleStartGeneration}
              onStop={handleStopGeneration}
              isGenerating={isGenerating}
            />
          </div>

          {/* Results */}
          <div className="card">
            <ResultDisplay result={result} isGenerating={isGenerating} />
          </div>
        </div>

        {/* Tips */}
        <div className="mt-12 card bg-atto-50 border border-atto-200">
          <h3 className="text-xl font-semibold text-atto-800 mb-4 flex items-center">
            <Sparkles className="w-5 h-5 mr-2" />
            Pro Tips
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-atto-700">
            <div>
              <h4 className="font-medium mb-2">Pattern Examples:</h4>
              <ul className="space-y-1 text-sm">
                <li>• "abc" - Find addresses containing "abc"</li>
                <li>• "a*c" - Find addresses with "a" and "c" separated by any character</li>
                <li>• "123*" - Find addresses starting with "123" followed by any character</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performance Notes:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Shorter patterns are found faster</li>
                <li>• "Start" option ignores first 2 characters (a,b,c,d)</li>
                <li>• Longer patterns may take significantly more time</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 space-y-4">
          <p className="text-gray-500">Generated addresses are cryptographically secure and compatible with ATTO wallets.</p>
          <div className="border-t pt-4">
            <p className="text-gray-600 mb-2">Made with ❤️ by Lynext</p>
            <div className="text-sm text-gray-500">
              <p className="mb-1">Support this project:</p>
              <p className="font-mono text-xs break-all bg-gray-100 p-2 rounded">
                atto://abnextegrj74n2md4i3mqhuicmyig6tdfk3u6zoyuzlx2uoixrnjk7b2jd7h2
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;