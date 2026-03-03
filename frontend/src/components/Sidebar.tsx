/**
 * Sidebar - Editor and Sage Dialogue Component
 * FINAL POLISH: Input at bottom, padding-top for greetings
 */

import { useState, useEffect } from 'react';
import { PlayerState, DialogueEntry } from '@obsidian-ledger/shared/types';
import { BookOpen, MessageSquare, Send, Code, CheckCircle, XCircle, Loader2, ScanSearch, FolderOpen, Sparkles } from 'lucide-react';

interface SidebarProps {
	playerState: PlayerState;
	dialogueHistory: DialogueEntry[];
	currentModule?: { id: string; title: string; content: string };
	currentZoneName?: string;
	currentZoneFileCount?: number;
	isScanning?: boolean;
	onScanProject?: (useCustom?: boolean, path?: string) => Promise<void>;
	onQuerySage: (query: string) => Promise<any>;
	onSubmitCode: (code: string) => Promise<any>;
	onModuleComplete?: (moduleId: string) => void;
	codeContent?: string;
	onCodeChange?: (code: string) => void;
	customPath?: string;
	onCustomPathChange?: (path: string) => void;
}

// Zone-specific Sage responses - SMART QUESTION HANDLING
const getSageResponse = (question: string, zoneName?: string, fileCount?: number, folderName?: string): string => {
  const count = fileCount || 0;
  const q = question.toLowerCase();
  
  // Pre-written question mappings
  if (q.includes('basics') || q.includes('where am i') || q.includes('what is this')) {
    return folderName 
      ? `You are in ${zoneName}. This folder contains ${count} files that handle your ${folderName} logic.`
      : `You are in ${zoneName}. This zone contains ${count} mysteries waiting to be discovered.`;
  }
  
  if (q.includes('zones') || q.includes('explore') || q.includes('world')) {
    return "The world is generated from your folders. You can visit The Bastion (Backend), The Forest (Frontend), and The Library (Shared).";
  }
  
  if (q.includes('complete') || q.includes('modules') || q.includes('progress')) {
    return folderName
      ? `Explore the files in this zone. Once you understand the ${folderName} structure, you can progress.`
      : "Explore the zones and complete the learning modules to progress through the world.";
  }
  
  if (q.includes('hint') || q.includes('help') || q.includes('code')) {
    return folderName
      ? `Look at the Code Editor. It is showing a snippet from your real project in the ${folderName} directory.`
      : "The Code Editor shows files from your project. Study them to understand the codebase.";
  }
  
  // Default zone-specific responses
  if (!zoneName) return `The ancient algorithms whisper... "${question}" holds secrets yet to be revealed.`;
  const z = zoneName.toLowerCase();
  if (z.includes('bastion') || z.includes('backend')) return `I see the server logic here is guarded by ${count} scripts. It is a fortress of APIs!`;
  if (z.includes('forest') || z.includes('frontend')) return `This greenery is woven from ${count} UI components. Watch your step among the React hooks!`;
  if (z.includes('library') || z.includes('shared')) return `Here lies the shared wisdom of ${count} types and interfaces. The Library holds many secrets!`;
  if (z.includes('mine') || z.includes('scraper')) return `The Mine reveals ${count} data veins. Extract with care, traveler!`;
  return `You stand in ${zoneName}. ${count} mysteries await your discovery.`;
};

// Sage Holographic Orb Component
function SageHolographicOrb({ isSpeaking }: { isSpeaking: boolean }) {
  const [pulsePhase, setPulsePhase] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);
  
  const pulse = Math.sin(pulsePhase) * 0.2 + 0.8;
  const glowIntensity = isSpeaking ? 1 : 0.6;
  
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      {/* Outer glow */}
      <div 
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle, rgba(168, 85, 247, ${glowIntensity * 0.3}) 0%, transparent 70%)`,
          filter: 'blur(8px)',
        }}
      />
      
      {/* Core orb */}
      <div 
        className="absolute inset-1 rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, 
            rgba(216, 180, 254, ${pulse}) 0%, 
            rgba(168, 85, 247, ${pulse * 0.8}) 50%, 
            rgba(139, 92, 246, ${pulse * 0.6}) 100%)`,
          boxShadow: `
            0 0 ${15 * pulse}px rgba(168, 85, 247, ${glowIntensity}),
            0 0 ${30 * pulse}px rgba(168, 85, 247, ${glowIntensity * 0.5}),
            inset 0 0 15px rgba(255, 255, 255, 0.2)
          `,
          transform: `scale(${pulse})`,
        }}
      />
      
      {/* Inner light */}
      <div 
        className="absolute top-2 left-2 w-2 h-2 rounded-full"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)',
        }}
      />
      
      {/* Sparkle effect when speaking */}
      {isSpeaking && (
        <>
          <Sparkles 
            className="absolute -top-1 -right-1 w-3 h-3 text-[#a855f7] animate-bounce" 
            style={{ filter: 'drop-shadow(0 0 4px #a855f7)' }}
          />
          <Sparkles 
            className="absolute -bottom-0.5 -left-1 w-2.5 h-2.5 text-[#d8b4fe] animate-bounce" 
            style={{ animationDelay: '0.2s', filter: 'drop-shadow(0 0 4px #d8b4fe)' }}
          />
        </>
      )}
    </div>
  );
}

export default function Sidebar({ 
	playerState, 
	dialogueHistory, 
	currentModule,
	currentZoneName,
	currentZoneFileCount,
	isScanning = false,
	onScanProject,
	onQuerySage, 
	onSubmitCode,
	onModuleComplete,
	codeContent: externalCodeContent,
	onCodeChange,
	customPath,
	onCustomPathChange
}: SidebarProps) {
	const [internalCode, setInternalCode] = useState(`// Welcome to The Obsidian Ledger
// Write or paste your code here to analyze

function helloWorld() {
	console.log("Hello, Scholar!");
	return "Welcome to your journey";
}
`);
	const [sageInput, setSageInput] = useState('');
	const [isLoadingSage, setIsLoadingSage] = useState(false);
	const [isValidating, setIsValidating] = useState(false);
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [validationResult, setValidationResult] = useState<{
		success: boolean;
		feedback: string;
		score?: number;
	} | null>(null);

	const codeContent = externalCodeContent !== undefined ? externalCodeContent : internalCode;
	
	const handleCodeChange = (newCode: string) => {
		setInternalCode(newCode);
		onCodeChange?.(newCode);
	};

	const handleSageSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!sageInput.trim() || isLoadingSage) return;

		setIsLoadingSage(true);
		try {
			const response = await onQuerySage(sageInput);
			if (response.suggestions) {
				setSuggestions(response.suggestions);
			}
			setSageInput('');
		} catch (error) {
			console.error('Failed to query sage:', error);
		} finally {
			setIsLoadingSage(false);
		}
	};

	const handleSubmitCode = async () => {
		if (!codeContent.trim() || isValidating) return;

		setIsValidating(true);
		setValidationResult(null);
		
		try {
			const result = await onSubmitCode(codeContent);
			setValidationResult(result);
			
			if (result.success && onModuleComplete && currentModule) {
				onModuleComplete(currentModule.id);
			}
		} catch (error) {
			console.error('Failed to validate code:', error);
			setValidationResult({
				success: false,
				feedback: 'An error occurred during validation. Please try again.'
			});
		} finally {
			setIsValidating(false);
		}
	};

	const handleScanClick = async () => {
		if (onScanProject && !isScanning) {
			if (customPath && customPath.trim()) {
				await onScanProject(true, customPath.trim());
			} else {
				await onScanProject(false);
			}
		}
	};

	const handleCustomPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onCustomPathChange?.(e.target.value);
	};

	const latestDialogue = dialogueHistory.length > 0
		? dialogueHistory[dialogueHistory.length - 1]
		: null;

	const zoneEntryMessage = currentZoneName && !latestDialogue?.message.includes(currentZoneName)
		? `I see you have entered ${currentZoneName}. What shall we build here?`
		: null;
		
	const isSageSpeaking = latestDialogue?.speaker === 'sage';

	// FINAL POLISH: Full height, overflow hidden, input at bottom, fixed position
	return (
		<div className="bg-[#110c1d] border-l border-[#a855f7] flex flex-col" 
			 style={{ position: 'fixed', right: 0, top: 0, width: '350px', height: '100vh', overflow: 'hidden', zIndex: 100 }}>
			{/* Custom Path Input */}
			<div className="p-3 bg-[#0a0812] border-b border-[#a855f7]">
				<div className="flex items-center gap-2 mb-2">
					<FolderOpen className="w-4 h-4 text-[#a855f7]" />
					<span className="text-xs text-[#d8b4fe]">Custom Path (optional)</span>
				</div>
				<input
					type="text"
					value={customPath || ''}
					onChange={handleCustomPathChange}
					placeholder="C:\path\to\project"
					className="w-full bg-[#110c1d] text-[#d8b4fe] px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#a855f7] border border-[#a855f7]/30"
				/>
			</div>

			{/* Scan Project Button */}
			{onScanProject && (
				<div className="p-3 bg-[#0a0812] border-b border-[#a855f7]">
					<button
						onClick={handleScanClick}
						disabled={isScanning}
						className={`w-full font-medium py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors text-sm ${
							isScanning 
								? 'bg-[#2a2a3a] cursor-not-allowed' 
								: 'bg-[#a855f7] hover:bg-[#9333ea] text-white'
						}`}
					>
						{isScanning ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" style={{ color: '#fbbf24' }} />
								<span style={{ color: '#fbbf24' }}>Scanning...</span>
							</>
						) : (
							<>
								<ScanSearch className="w-4 h-4" />
								<span>Scan Project</span>
							</>
						)}
					</button>
				</div>
			)}

			{/* Current Zone Indicator */}
			{currentZoneName && (
				<div className="px-4 py-2 bg-[#110c1d] border-b border-[#a855f7]">
					<p className="text-xs text-[#a855f7]">Current Zone:</p>
					<p className="text-sm text-[#d8b4fe] font-medium">{currentZoneName}</p>
					{currentZoneFileCount !== undefined && (
						<p className="text-xs text-[#a855f7] mt-1">📁 {currentZoneFileCount} files</p>
					)}
				</div>
			)}

			{/* Code Editor Section - flex-1 to take available space */}
			<div className="flex-1 flex flex-col border-b border-[#a855f7] min-h-0">
				<div className="flex items-center justify-between px-3 py-2 bg-[#0a0812] border-b border-[#a855f7]">
					<div className="flex items-center gap-2">
						<Code className="w-4 h-4 text-[#a855f7]" />
						<span className="text-[#d8b4fe] font-medium text-sm">Code Editor</span>
					</div>
					{currentModule && (
						<span className="text-xs text-[#a855f7]">{currentModule.title}</span>
					)}
				</div>
				
				{currentModule && (
					<div className="px-3 py-1.5 bg-[#110c1d] border-b border-[#a855f7]">
						<p className="text-xs text-[#d8b4fe]/70">{currentModule.content}</p>
					</div>
				)}
				
				<textarea
					value={codeContent}
					onChange={(e) => handleCodeChange(e.target.value)}
					className="flex-1 w-full bg-[#0a0812] text-[#d8b4fe] p-3 font-mono text-xs resize-none focus:outline-none"
					spellCheck={false}
					placeholder="Write or paste your code here..."
				/>
				
				<div className="p-2 bg-[#0a0812] border-t border-[#a855f7]">
					<button
						onClick={handleSubmitCode}
						disabled={isValidating || !codeContent.trim()}
						className="w-full bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#2a2a3a] text-white font-medium py-1.5 px-3 rounded flex items-center justify-center gap-2 transition-colors text-sm"
					>
						{isValidating ? (
							<>
								<Loader2 className="w-3 h-3 animate-spin" />
								Validating...
							</>
						) : (
							<>
								<CheckCircle className="w-3 h-3" />
								Submit
							</>
						)}
					</button>
					
					{validationResult && (
						<div className={`mt-2 p-2 rounded-lg text-xs ${
							validationResult.success 
								? 'bg-[#a855f7]/20 border border-[#a855f7]' 
								: 'bg-red-500/20 border border-red-500'
						}`}>
							<div className="flex items-center gap-2">
								{validationResult.success ? (
									<CheckCircle className="w-3 h-3 text-[#a855f7]" />
								) : (
									<XCircle className="w-3 h-3 text-red-400" />
								)}
								<span className={validationResult.success ? 'text-[#a855f7]' : 'text-red-400'}>
									{validationResult.success ? 'Accepted!' : 'Try Again!'}
								</span>
								{validationResult.score !== undefined && (
									<span className="ml-auto text-xs text-[#d8b4fe]">
										{validationResult.score}%
									</span>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Sage Dialogue Section - FINAL POLISH: Input at absolute bottom */}
			<div className="flex flex-col" style={{ 
				height: '45%', 
				minHeight: '200px',
				border: '2px solid #a855f7', 
				boxShadow: '0 0 15px rgba(168, 85, 247, 0.5), inset 0 0 30px rgba(168, 85, 247, 0.1)',
				background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.05) 0%, rgba(10, 8, 18, 0.9) 100%)'
			}}>
				{/* Sage Holographic Orb Header - Fixed at top */}
				<div className="flex items-center gap-2 px-3 py-2 bg-[#0a0812] border-b border-[#a855f7] flex-shrink-0">
					<SageHolographicOrb isSpeaking={isSageSpeaking} />
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<MessageSquare className="w-4 h-4 text-[#a855f7]" />
							<span className="text-[#d8b4fe] font-medium text-sm">Sage NPC</span>
						</div>
						<span className="text-xs text-[#a855f7]">Level {playerState.level}</span>
					</div>
				</div>

				{/* Dialogue Messages - scrollable with pt-8 to avoid overlap with header */}
				<div className="flex-1 p-3 pt-8 space-y-2 overflow-y-auto" style={{ paddingTop: '2rem' }}>
					{zoneEntryMessage && (
						<div className="p-2 rounded-lg bg-[#110c1d] border-l-2 border-[#a855f7] text-sm">
							<p className="text-[#d8b4fe] whitespace-pre-wrap">
								{zoneEntryMessage}
							</p>
						</div>
					)}
					{latestDialogue ? (
						<div className={`p-2 rounded-lg text-sm ${
							latestDialogue.speaker === 'sage' 
								? 'bg-[#110c1d] border-l-2 border-[#a855f7]' 
								: latestDialogue.speaker === 'player'
								? 'bg-[#1a1429] ml-3 border-l-2 border-[#d8b4fe]'
								: 'bg-[#0a0812] text-center text-xs text-[#d8b4fe]'
						}`}>
							<p className="text-[#d8b4fe] whitespace-pre-wrap">
								{latestDialogue.message}
							</p>
						</div>
					) : currentZoneName ? (
						<div className="text-center text-[#d8b4fe] text-sm p-2">
							<p>{getSageResponse('Where am I?', currentZoneName, currentZoneFileCount)}</p>
						</div>
					) : (
						<div className="text-center text-[#d8b4fe] text-sm p-2">
							<p>Greetings, traveler!</p>
							<p className="text-xs mt-1">Scan your project to begin the journey...</p>
						</div>
					)}

					{suggestions.length > 0 && (
						<div className="mt-2 space-y-1">
							<p className="text-xs text-[#d8b4fe]">You might want to ask:</p>
							{suggestions.map((suggestion, index) => (
								<button
									key={index}
									onClick={() => setSageInput(suggestion)}
									className="block w-full text-left text-xs text-[#a855f7] hover:text-[#d8b4fe] py-0.5"
								>
									→ {suggestion}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Input Form - Fixed at absolute bottom */}
				<form onSubmit={handleSageSubmit} className="p-2 border-t border-[#a855f7] flex-shrink-0">
					<div className="flex gap-2">
						<input
							type="text"
							value={sageInput}
							onChange={(e) => setSageInput(e.target.value)}
							placeholder="Ask the Sage..."
							className="flex-1 bg-[#0a0812] text-[#d8b4fe] px-2 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
							disabled={isLoadingSage}
						/>
						<button
							type="submit"
							disabled={isLoadingSage || !sageInput.trim()}
							className="bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#2a2a3a] text-white p-1.5 rounded transition-colors"
						>
							{isLoadingSage ? (
								<Loader2 className="w-3 h-3 animate-spin" />
							) : (
								<Send className="w-3 h-3" />
							)}
						</button>
					</div>
				</form>
			</div>

			{/* Stats Footer */}
			<div className="px-3 py-1.5 bg-[#0a0812] border-t border-[#a855f7] flex-shrink-0">
				<div className="flex items-center justify-between text-xs">
					<div className="flex items-center gap-2">
						<BookOpen className="w-3 h-3 text-[#a855f7]" />
						<span className="text-[#d8b4fe]">Modules: {playerState.completedModules.length}</span>
					</div>
					<div className="text-[#d8b4fe]">
						XP: {playerState.experience}
					</div>
				</div>
			</div>
		</div>
	);
}
