import React, { useState, useRef } from 'react';
import { Play, Square, AlertCircle, Info, Search, Sparkles } from 'lucide-react';
import { generateMnemonic, generateAttoAddressFromMnemonic, matchesPattern } from '../utils/attoGenerator.js';

const VanityGenerator = ({
  onResult,
  onStart,
  onStop,
  isGenerating
}) => {
  const [targetString, setTargetString] = useState('');
  const [searchType, setSearchType] = useState('contain');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [attemptsPerSecond, setAttemptsPerSecond] = useState(0);
  
  const isRunningRef = useRef(false);
  const lastUpdateRef = useRef(0);
  const attemptsCountRef = useRef(0);
  const startTimeRef = useRef(null);

  const validateInput = () => {
    if (!targetString.trim()) {
      setError('Please enter a target string');
      return false;
    }
    
    if (targetString.length > 10) {
      setError('Target string should be 10 characters or less for reasonable generation time');
      return false;
    }
    
    // Check for invalid characters (Base32 alphabet only)
    const validChars = /^[a-zA-Z2-7*]+$/;
    if (!validChars.test(targetString)) {
      setError('Target string can only contain letters (a-z), numbers (2-7), and wildcards (*)');
      return false;
    }
    
    setError('');
    return true;
  };

  const updateProgress = () => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= 150) { // Update every 150ms for responsive display
      const elapsed = startTimeRef.current ? (now - startTimeRef.current) / 1000 : 0;
      const rate = elapsed > 0 ? attemptsCountRef.current / elapsed : (attemptsCountRef.current > 0 ? Infinity : 0);
      setAttemptsPerSecond(rate);
      lastUpdateRef.current = now;
    }
  };

  const generateVanityAddress = async () => {
    if (!validateInput()) return;
    
    isRunningRef.current = true;
    onStart();
    setAttempts(0);
    startTimeRef.current = Date.now();
    setCurrentAddress('');
    setAttemptsPerSecond(0);
    attemptsCountRef.current = 0;
    lastUpdateRef.current = Date.now();
    
    try {
      while (isRunningRef.current) {
        const mnemonic = generateMnemonic();
        const address = await generateAttoAddressFromMnemonic(mnemonic);
        
        attemptsCountRef.current++;
        setAttempts(attemptsCountRef.current);
        setCurrentAddress(address);
        
        updateProgress();
        
        if (matchesPattern(address, targetString, searchType)) {
          const endTime = Date.now();
          const timeElapsed = startTimeRef.current ? (endTime - startTimeRef.current) / 1000 : 0;
          const finalAttemptsPerSecond = timeElapsed > 0 ? attemptsCountRef.current / timeElapsed : (attemptsCountRef.current > 0 ? Infinity : 0);
          
          const result = {
            address,
            mnemonic,
            attempts: attemptsCountRef.current,
            timeElapsed,
            attemptsPerSecond: finalAttemptsPerSecond,
            targetString,
            searchType
          };
          
          onResult(result);
          isRunningRef.current = false;
          return;
        }
        
        // Yield control to prevent UI blocking
        if (attemptsCountRef.current % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    } catch (err) {
      setError(`Generation error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      onStop();
    }
  };

  const stopGeneration = () => {
    isRunningRef.current = false;
    onStop();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isGenerating) {
      stopGeneration();
    } else {
      generateVanityAddress();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Vanity Address</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target String Input */}
        <div>
          <label htmlFor="targetString" className="block text-sm font-medium text-gray-700 mb-3">
            <div className="flex items-center">
              <Sparkles className="w-4 h-4 text-atto-500 mr-2" />
              Target String
            </div>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`w-5 h-5 transition-colors ${
                targetString ? 'text-atto-500' : 'text-gray-400 group-focus-within:text-atto-500'
              }`} />
            </div>
            <input
              type="text"
              id="targetString"
              value={targetString}
              onChange={(e) => setTargetString(e.target.value)}
              placeholder="e.g., abc, a*c, 123"
              className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isGenerating
                  ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                  : error
                  ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                  : targetString
                  ? 'border-atto-300 bg-atto-50 text-atto-900 focus:border-atto-500 focus:ring-4 focus:ring-atto-100 shadow-sm'
                  : 'border-gray-300 bg-white text-gray-900 focus:border-atto-500 focus:ring-4 focus:ring-atto-100 hover:border-gray-400'
              } placeholder:text-gray-400 focus:outline-none shadow-sm hover:shadow-md focus:shadow-lg`}
              disabled={isGenerating}
              maxLength={10}
            />
            {targetString && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className={`w-2 h-2 rounded-full ${
                  error ? 'bg-red-400' : 'bg-atto-400 animate-pulse'
                }`} />
              </div>
            )}
          </div>
          <div className="mt-2 flex items-start space-x-2">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500 leading-relaxed">
              Use <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-atto-600">*</span> as wildcard. 
              Letters (a-z), numbers (2-7) only. Max 10 characters for optimal performance.
            </p>
          </div>
        </div>

        {/* Search Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Match Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'start', label: 'Starts With', desc: 'Ignores first 2 chars' },
              { value: 'contain', label: 'Contains', desc: 'Anywhere in address' },
              { value: 'end', label: 'Ends With', desc: 'At the end' }
            ].map(({ value, label, desc }) => (
              <label key={value} className="relative">
                <input
                  type="radio"
                  name="searchType"
                  value={value}
                  checked={searchType === value}
                  onChange={(e) => setSearchType(e.target.value)}
                  disabled={isGenerating}
                  className="sr-only"
                />
                <div className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  searchType === value
                    ? 'border-atto-500 bg-atto-50 text-atto-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-gray-500 mt-1">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Progress Display */}
        {isGenerating && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Generating...</span>
              <span className="text-sm text-blue-600">{attemptsPerSecond === Infinity ? 'Infinity' : Math.round(attemptsPerSecond).toLocaleString()} attempts/sec</span>
            </div>
            <div className="text-sm text-blue-600 mb-2">
              Attempts: {attempts.toLocaleString()}
            </div>
            {currentAddress && (
              <div className="text-xs text-blue-500 font-mono break-all">
                Current: {currentAddress}
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!targetString.trim() && !isGenerating}
          className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all ${
            isGenerating
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'btn-primary'
          }`}
        >
          {isGenerating ? (
            <>
              <Square className="w-5 h-5 mr-2" />
              Stop Generation
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Start Generation
            </>
          )}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-gray-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Generation Tips:</p>
            <ul className="space-y-1 text-xs">
              <li>• Shorter patterns are found much faster</li>
              <li>• Each additional character increases difficulty exponentially</li>
              <li>• Generation runs in your browser - no data is sent to servers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VanityGenerator;