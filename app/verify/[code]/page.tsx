import { getDb, ObjectId } from "@/lib/mongodb";
import DeedVerify from "@/components/DeedVerify";

export default async function NeighborVerify({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const db = await getDb();
  const deed = await db.collection("goodDeeds").findOne({ code });

  let childName = "A child";
  let alreadyConfirmed = false;
  if (deed) {
    alreadyConfirmed = !!deed.isConfirmed;
    if (deed.childId && ObjectId.isValid(deed.childId)) {
      const child = await db.collection("children").findOne(
        { _id: new ObjectId(deed.childId) },
        { projection: { name: 1 } },
      );
      if (child?.name) childName = child.name;
    }
  }

  return (
    <div className="min-h-screen bg-emerald-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-4xl p-8 max-w-sm w-full shadow-2xl">
        {deed ? (
          <DeedVerify code={code} childName={childName} alreadyConfirmed={alreadyConfirmed} />
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-2xl font-serif mb-2">Code not found</h2>
            <p className="text-slate-600">This deed code isn&apos;t valid. Double-check the link or card.</p>
          </div>
        )}
      </div>
    </div>
  );
}
