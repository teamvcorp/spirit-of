import { confirmDeed } from "@/app/actions";

export default async function NeighborVerify({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="min-h-screen bg-emerald-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-4xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">✨</span>
        </div>
        <h2 className="text-2xl font-serif mb-2">A Good Deed!</h2>
        <p className="text-slate-600 mb-8">One of Santa's helpers assisted you. Verify this to grant them a Magic Point.</p>
        
        <form action={confirmDeed}>
          <input type="hidden" name="code" value={code} />
          <textarea 
            name="note"
            className="w-full bg-slate-50 border-none rounded-xl p-4 mb-4" 
            placeholder="Leave a nice note..."
          />
          <button className="w-full bg-slate-900 text-white py-4 rounded-full font-bold hover:bg-emerald-700 transition-colors">
            Confirm Deed
          </button>
        </form>
      </div>
    </div>
  );
}