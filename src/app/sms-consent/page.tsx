export default function SmsConsentPage() {
  return (
    <main style={{ maxWidth: 600, margin: "60px auto", padding: "0 24px", fontFamily: "system-ui, sans-serif", color: "#111" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>SMS Notification Consent</h1>
      <p style={{ color: "#555", marginBottom: 32 }}>Last updated: April 2025</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>How we collect consent</h2>
        <p>When a customer visits a store page on Product Drops, they are presented with a phone number field and a checkbox confirming they agree to receive SMS notifications about order confirmations and pickup reminders. Submission of this form constitutes opt-in consent.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>What messages we send</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Order confirmation when a customer places an order</li>
          <li>Pickup reminder when their order is ready for collection</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>How to opt out</h2>
        <p>Reply STOP to any message to unsubscribe. You will receive no further messages.</p>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Message frequency</h2>
        <p>Message frequency varies. Message and data rates may apply.</p>
      </section>
    </main>
  );
}
