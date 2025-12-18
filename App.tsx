import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './components/Logo';
import { FileUpload } from './components/FileUpload';
import { Dialect, CharacterAction, AppState, AspectRatio, VideoAspectRatio, VoiceName } from './types';
import { DIALECT_OPTIONS, ACTION_OPTIONS, IMAGE_ASPECT_RATIOS, VIDEO_RATIO_OPTIONS, VOICE_OPTIONS, SAMPLE_PROMPT } from './constants';
import * as GeminiService from './services/geminiService';

export default function App() {
  const [state, setState] = useState<AppState>({
    originalImage: null,
    base64Image: null,
    promptText: SAMPLE_PROMPT,
    imagePrompt: "Un retrato cinemático de un personaje colombiano tradicional, iluminación dramática, 4k",
    selectedDialect: Dialect.NEUTRAL_COL,
    selectedActions: [CharacterAction.SPEAKING],
    selectedVoice: 'Kore',
    selectedImageAspectRatio: '1:1',
    selectedVideoAspectRatio: '16:9',
    isGeneratingScript: false,
    isGeneratingAudio: false,
    isGeneratingVideo: false,
    isGeneratingImage: false,
    isEditingImage: false,
    generated: {
      script: '',
      dialect: Dialect.NEUTRAL_COL,
    },
  });

  const [activeTab, setActiveTab] = useState<'upload' | 'generate'>('upload');
  const [editPrompt, setEditPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if API key is already selected on mount
  useEffect(() => {
    const checkKeyStatus = async () => {
      const win = window as any;
      if (win.aistudio?.hasSelectedApiKey) {
        const selected = await win.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKeyStatus();
  }, []);

  const handleOpenSelectKey = async () => {
    const win = window as any;
    if (win.aistudio?.openSelectKey) {
      await win.aistudio.openSelectKey();
      setHasApiKey(true);
      setError(null);
    }
  };

  const handleImageSelected = (file: File, base64: string) => {
    const base64Clean = base64.split(',')[1];
    setState(prev => ({
      ...prev,
      originalImage: URL.createObjectURL(file),
      base64Image: base64Clean,
    }));
  };

  const toggleAction = (action: CharacterAction) => {
    setState(prev => {
      const isSelected = prev.selectedActions.includes(action);
      if (isSelected) {
        return { ...prev, selectedActions: prev.selectedActions.filter(a => a !== action) };
      } else {
        return { ...prev, selectedActions: [...prev.selectedActions, action] };
      }
    });
  };

  const handleError = (e: any, defaultMsg: string) => {
    console.error(e);
    const errorMessage = e.message || String(e);
    if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("404") || errorMessage.includes("NOT_FOUND")) {
      setError("Error 404: El modelo no está disponible. Asegúrate de haber seleccionado una API Key con acceso a modelos Pro/Veo y facturación activa.");
      handleOpenSelectKey();
    } else {
      setError(defaultMsg);
    }
  };

  const handleGenerateImage = async () => {
    if (!state.imagePrompt) return;
    setError(null);
    setState(prev => ({ ...prev, isGeneratingImage: true }));
    try {
      const base64 = await GeminiService.generateCharacterImage(state.imagePrompt, state.selectedImageAspectRatio);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {type: 'image/png'});
      const newUrl = URL.createObjectURL(blob);
      setState(prev => ({
        ...prev,
        originalImage: newUrl,
        base64Image: base64,
        isGeneratingImage: false
      }));
    } catch (e: any) {
      handleError(e, "Error generando imagen.");
      setState(prev => ({ ...prev, isGeneratingImage: false }));
    }
  };

  const handleEditImage = async () => {
    if (!state.base64Image || !editPrompt) return;
    setError(null);
    setState(prev => ({ ...prev, isEditingImage: true }));
    try {
      const newBase64 = await GeminiService.editCharacterImage(state.base64Image, editPrompt);
      const byteCharacters = atob(newBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {type: 'image/png'});
      const newUrl = URL.createObjectURL(blob);
      setState(prev => ({
        ...prev,
        originalImage: newUrl,
        base64Image: newBase64,
        isEditingImage: false
      }));
      setEditPrompt(""); 
    } catch (e) {
      handleError(e, "Error editando la imagen.");
      setState(prev => ({ ...prev, isEditingImage: false }));
    }
  };

  const handleGenerateScript = async () => {
    if (!state.promptText) return;
    setError(null);
    setState(prev => ({ ...prev, isGeneratingScript: true }));
    try {
      const script = await GeminiService.generateDialectScript(state.promptText, state.selectedDialect);
      setState(prev => ({
        ...prev,
        generated: { ...prev.generated, script, dialect: state.selectedDialect },
        isGeneratingScript: false
      }));
    } catch (e) {
      handleError(e, "Error al generar el guion.");
      setState(prev => ({ ...prev, isGeneratingScript: false }));
    }
  };

  const handleGenerateAudio = async () => {
    const textToSpeak = state.generated.script || state.promptText;
    if (!textToSpeak) return;
    setError(null);
    setState(prev => ({ ...prev, isGeneratingAudio: true }));
    try {
      const audioUrl = await GeminiService.generateSpeech(textToSpeak, state.selectedVoice);
      setState(prev => ({
        ...prev,
        generated: { ...prev.generated, audioUrl },
        isGeneratingAudio: false
      }));
    } catch (e) {
      handleError(e, "Error al generar el audio.");
      setState(prev => ({ ...prev, isGeneratingAudio: false }));
    }
  };

  const handleGenerateVideo = async () => {
    if (!state.base64Image) {
      setError("Sube o genera una imagen primero.");
      return;
    }
    if (state.selectedActions.length === 0) {
      setError("Selecciona al menos una acción.");
      return;
    }
    setError(null);
    setState(prev => ({ ...prev, isGeneratingVideo: true }));
    try {
      const videoUrl = await GeminiService.generateCharacterVideo(
        state.base64Image,
        state.selectedActions,
        state.selectedDialect,
        state.selectedVideoAspectRatio
      );
      setState(prev => ({
        ...prev,
        generated: { ...prev.generated, videoUrl },
        isGeneratingVideo: false
      }));
    } catch (e: any) {
      handleError(e, "Error generando video.");
      setState(prev => ({ ...prev, isGeneratingVideo: false }));
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-light bg-[#050505] text-gray-200">
      
      {/* Navbar Glass */}
      <nav className="glass-panel sticky top-0 z-50 py-4 px-6 mb-8 border-b-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo className="w-10 h-10" />
            <div className="leading-tight">
              <h1 className="text-xl font-bold tracking-widest text-white">EDITORI-APP</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">Agente de Vida Artificial</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleOpenSelectKey}
              className={`text-xs px-4 py-2 rounded-full border transition-all ${hasApiKey ? 'border-green-500/50 text-green-400 bg-green-500/10' : 'border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'}`}
            >
              {hasApiKey ? '✓ API KEY CONFIGURADA' : 'CONFIGURAR API KEY (VEO/PRO)'}
            </button>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-xs text-gray-500 hover:text-white transition-colors underline">
              Facturación Docs
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: EDITOR (40%) */}
        <div className="lg:col-span-5 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-2 scrollbar-custom">
          
          {/* Panel 1: Source */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Origen</h2>
              {state.originalImage && (
                <div className="flex gap-2">
                   <a 
                    href={state.originalImage} 
                    download={`personaje_editori_${Date.now()}.png`}
                    className="text-[10px] bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 px-2 py-1 rounded transition-colors flex items-center gap-1 border border-blue-500/30"
                   >
                     BAJAR FOTO
                   </a>
                   <button 
                    onClick={() => setState(prev => ({...prev, originalImage: null, base64Image: null}))}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider"
                  >
                    REMOVER
                  </button>
                </div>
              )}
            </div>
            
            {state.originalImage ? (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-white/10 group h-64 shadow-2xl">
                  <img src={state.originalImage} alt="Reference" className="w-full h-full object-cover" />
                  {(state.isEditingImage) && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
                       <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <label className="text-[10px] uppercase text-blue-400 font-bold tracking-wider block">
                    Edición Mágica (Gemini 2.5)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Ej: 'Añadir sombrero', 'Ojos verdes'..."
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 text-xs text-white focus:border-blue-500 outline-none h-9"
                    />
                    <button 
                      onClick={handleEditImage}
                      disabled={state.isEditingImage || !editPrompt}
                      className="bg-blue-600/80 hover:bg-blue-600 disabled:opacity-50 text-white px-3 rounded-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex border-b border-white/10">
                  <button onClick={() => setActiveTab('upload')} className={`flex-1 pb-2 text-xs font-medium tracking-wider transition-all ${activeTab === 'upload' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>SUBIR FOTO</button>
                  <button onClick={() => setActiveTab('generate')} className={`flex-1 pb-2 text-xs font-medium tracking-wider transition-all ${activeTab === 'generate' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>GENERAR CON IA</button>
                </div>
                {activeTab === 'upload' ? <FileUpload onImageSelected={handleImageSelected} /> : (
                  <div className="space-y-3">
                    <textarea value={state.imagePrompt} onChange={(e) => setState(prev => ({...prev, imagePrompt: e.target.value}))} placeholder="Describe tu personaje..." className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none resize-none" />
                    <div className="flex gap-2">
                      <select className="bg-black/40 border border-white/10 rounded-lg px-2 text-xs text-white focus:border-blue-500 outline-none h-10 w-24" value={state.selectedImageAspectRatio} onChange={(e) => setState(prev => ({...prev, selectedImageAspectRatio: e.target.value as AspectRatio}))}>
                        {IMAGE_ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button onClick={handleGenerateImage} disabled={state.isGeneratingImage || !state.imagePrompt} className="flex-1 bg-gradient-to-r from-blue-700 to-indigo-700 hover:brightness-110 disabled:opacity-50 text-white rounded-lg text-xs font-bold tracking-wider">
                        {state.isGeneratingImage ? 'GENERANDO...' : 'CREAR PERSONAJE'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel 2: Behavior Config */}
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Comportamiento</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Dialecto y Contexto</label>
                <div className="relative">
                  <select className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none appearance-none" value={state.selectedDialect} onChange={(e) => setState(prev => ({...prev, selectedDialect: e.target.value as Dialect}))}>
                    {DIALECT_OPTIONS.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none text-gray-500">▼</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Acciones Simultáneas</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-custom">
                  {ACTION_OPTIONS.map(action => (
                    <button key={action} onClick={() => toggleAction(action)} className={`text-[10px] px-2 py-2 rounded-lg border transition-all text-left flex items-center gap-2 ${state.selectedActions.includes(action) ? 'bg-blue-600/30 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                      <div className={`w-2 h-2 rounded-full ${state.selectedActions.includes(action) ? 'bg-blue-400' : 'bg-gray-700'}`}></div>
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              {/* VIDEO ASPECT RATIO SELECTION (REDISEÑADO) */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Formato de Exportación (Redes Sociales)</label>
                <div className="grid grid-cols-1 gap-2">
                   {VIDEO_RATIO_OPTIONS.map(option => (
                     <button
                       key={option.id}
                       onClick={() => setState(prev => ({...prev, selectedVideoAspectRatio: option.id}))}
                       className={`
                        p-3 rounded-xl border text-left transition-all flex items-center gap-3
                        ${state.selectedVideoAspectRatio === option.id 
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg' 
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}
                       `}
                     >
                       <span className="text-xl">{option.icon}</span>
                       <div>
                         <p className="text-[11px] font-bold tracking-tight">{option.label}</p>
                         <p className="text-[9px] opacity-60 uppercase">{option.sub}</p>
                       </div>
                       {state.selectedVideoAspectRatio === option.id && (
                         <div className="ml-auto w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                           <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                         </div>
                       )}
                     </button>
                   ))}
                </div>
              </div>
            </div>
          </div>

          {/* Panel 3: Voice & Script */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Narrativa y Voz</h2>
            <textarea className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-300 focus:border-blue-500 outline-none resize-none" placeholder="¿Qué quieres que diga el personaje?..." value={state.promptText} onChange={(e) => setState(prev => ({...prev, promptText: e.target.value}))} />
            <div className="space-y-1">
               <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Selección de Voz</label>
               <select className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none appearance-none" value={state.selectedVoice} onChange={(e) => setState(prev => ({...prev, selectedVoice: e.target.value as VoiceName}))}>
                 {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id} className="bg-slate-900">{v.label}</option>)}
               </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleGenerateScript} disabled={state.isGeneratingScript} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg text-xs font-medium transition-all">{state.isGeneratingScript ? 'ANALIZANDO...' : 'ADAPTAR SCRIPT'}</button>
              <button onClick={handleGenerateAudio} disabled={state.isGeneratingAudio || (!state.generated.script && !state.promptText)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg text-xs font-medium transition-all">{state.isGeneratingAudio ? 'SINTETIZANDO...' : 'GENERAR VOZ'}</button>
            </div>
            {state.generated.script && <div className="p-3 bg-black/20 rounded border border-white/5 max-h-32 overflow-y-auto"><p className="text-[9px] text-blue-400 mb-1 font-bold">SCRIPT FINAL:</p><p className="text-xs italic text-gray-400 leading-relaxed">"{state.generated.script}"</p></div>}
             {state.generated.audioUrl && <div className="w-full p-2 bg-white/5 rounded-xl border border-white/10"><audio key={state.generated.audioUrl} controls src={state.generated.audioUrl} className="w-full h-8" /></div>}
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW (60%) */}
        <div className="lg:col-span-7 flex flex-col h-[calc(100vh-120px)]">
          <div className="glass-panel rounded-2xl flex-1 p-1 relative overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex-1 bg-black/60 rounded-xl relative flex items-center justify-center overflow-hidden min-h-[400px]">
              {!state.generated.videoUrl && !state.base64Image && !state.isGeneratingImage && (
                 <div className="text-center opacity-10 animate-pulse"><Logo className="w-64 h-64 mx-auto grayscale" /><p className="mt-4 font-mono text-xl tracking-[0.5em]">EDITORIA AI</p></div>
              )}
              {state.base64Image && !state.generated.videoUrl && !state.isGeneratingVideo && (
                 <img src={state.originalImage!} className="h-full w-full object-contain opacity-40 blur-md scale-110 transition-all duration-1000" />
              )}
              {state.generated.videoUrl && (
                <div className="relative w-full h-full flex items-center justify-center z-10">
                  <video ref={videoRef} src={state.generated.videoUrl} controls autoPlay loop playsInline preload="auto" className="w-full h-full object-contain shadow-2xl" />
                  <button onClick={restartVideo} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-lg backdrop-blur-md border border-white/10 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100 focus:opacity-100" title="Reiniciar Video">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  </button>
                </div>
              )}
              {state.isGeneratingVideo && (
                <div className="absolute inset-0 bg-black/95 z-20 flex flex-col items-center justify-center">
                  <div className="relative mb-8"><div className="w-24 h-24 border-t-2 border-b-2 border-yellow-500 rounded-full animate-spin"></div><div className="absolute inset-4 border-l-2 border-r-2 border-blue-500 rounded-full animate-spin-slow"></div></div>
                  <h3 className="text-2xl font-light text-white tracking-[0.3em] animate-pulse">CREANDO VIDA</h3>
                  <p className="text-[10px] text-gray-500 mt-4 font-mono uppercase">Uniendo {state.selectedActions.length} capas de comportamiento...</p>
                </div>
              )}
              {state.isGeneratingImage && (
                <div className="absolute inset-0 bg-black/95 z-20 flex flex-col items-center justify-center"><div className="w-16 h-16 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-6"></div><h3 className="text-xl font-light text-white tracking-widest animate-pulse">DIBUJANDO ALMA</h3></div>
              )}
            </div>
            <div className="p-6 flex flex-col md:flex-row gap-4 bg-black/40 border-t border-white/5">
              <button onClick={handleGenerateVideo} disabled={state.isGeneratingVideo || !state.base64Image || state.isGeneratingImage} className={`flex-1 py-5 px-8 rounded-2xl font-black tracking-[0.2em] uppercase transition-all duration-500 transform active:scale-95 ${(state.isGeneratingVideo || !state.base64Image || state.isGeneratingImage) ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-br from-yellow-500 via-red-600 to-blue-700 hover:brightness-125 text-white shadow-[0_10px_30px_rgba(255,0,0,0.3)]'}`}>
                {state.isGeneratingVideo ? 'SINCRONIZANDO...' : 'Animar Personaje'}
              </button>
              {state.generated.videoUrl && <a href={state.generated.videoUrl} download={`video_editori_${Date.now()}.mp4`} className="px-8 py-5 bg-white/5 hover:bg-green-600/40 text-white rounded-2xl flex items-center justify-center transition-all border border-white/10 gap-3 font-bold tracking-widest"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>EXPORTAR</a>}
            </div>
          </div>
          {error && <div className="mt-4 p-4 glass-panel border-red-500/30 text-red-300 text-xs text-center rounded-xl">⚠️ {error}</div>}
        </div>
      </main>

      <style>{`
        .scrollbar-custom::-webkit-scrollbar { width: 4px; }
        .scrollbar-custom::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-custom::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        video::-webkit-media-controls-panel { background-image: linear-gradient(transparent, rgba(0,0,0,0.8)); }
      `}</style>
    </div>
  );
}