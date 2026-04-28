'use client'

type ToastProps = {
  message: string
  show: boolean
}

export default function Toast({ message, show }: ToastProps) {
  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-6 z-[100] w-[calc(100%-32px)] max-w-[430px] -translate-x-1/2 transition-all duration-300 ${
        show
          ? 'translate-y-0 opacity-100'
          : '-translate-y-3 opacity-0'
      }`}
    >
      <div className="mx-auto rounded-full border border-emerald-400/20 bg-black/85 px-4 py-3 text-center text-sm font-medium text-emerald-400 shadow-lg backdrop-blur-xl">
        {message}
      </div>
    </div>
  )
}