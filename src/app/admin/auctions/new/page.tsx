import NewAuctionWithPropertyForm from "../NewAuctionWithPropertyForm";

export const dynamic = "force-dynamic";

export default function NewAuctionPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900 mb-8">
        List Property for Auction
      </h1>
      <NewAuctionWithPropertyForm />
    </div>
  );
}
