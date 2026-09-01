import {
  AlertCircle,
  Check,
  ClipboardList,
  Copy,
  Landmark,
  Loader2,
  Network,
  Play,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Users,
  Wallet
} from "lucide-react";
import { isAddress } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatEth,
  getInjectedProvider,
  getInitialVaultAddress,
  getVaultContract,
  isSameAddress,
  LOCAL_CHAIN,
  normalizeData,
  parseEth,
  saveVaultAddress,
  shortenAddress,
  switchToLocalChain
} from "./contract.js";

const EMPTY_FORM = {
  to: "",
  value: "",
  data: "0x"
};

function App() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [vaultAddress, setVaultAddress] = useState(getInitialVaultAddress);
  const [draftVaultAddress, setDraftVaultAddress] = useState(getInitialVaultAddress);
  const [vault, setVault] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [depositAmount, setDepositAmount] = useState("");
  const [txFilter, setTxFilter] = useState("pending");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const isConnected = Boolean(account);
  const isLocalChain = chainId === LOCAL_CHAIN.id;
  const isVaultLoaded = Boolean(vault);
  const chainLabel = chainId ? (isLocalChain ? "Anvil 31337" : `Chain ${chainId.toString()}`) : "No network";
  const isCurrentAccountOwner = useMemo(() => {
    if (!vault || !account) {
      return false;
    }

    return vault.owners.some((owner) => isSameAddress(owner, account));
  }, [account, vault]);

  const pendingTransactions = useMemo(
    () => transactions.filter((transaction) => !transaction.executed),
    [transactions]
  );
  const executedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.executed),
    [transactions]
  );
  const visibleTransactions = useMemo(() => {
    if (txFilter === "executed") {
      return executedTransactions;
    }

    if (txFilter === "all") {
      return transactions;
    }

    return pendingTransactions;
  }, [executedTransactions, pendingTransactions, transactions, txFilter]);

  const showNotice = useCallback((message) => {
    setNotice(message);
    setError("");
  }, []);

  const showError = useCallback((message) => {
    setError(message);
    setNotice("");
  }, []);

  const connectWallet = useCallback(async () => {
    setBusy("connect");

    try {
      const provider = getInjectedProvider();
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      setAccount(await signer.getAddress());
      setChainId(network.chainId);
      showNotice("Wallet connected.");
    } catch (error) {
      showError(error.shortMessage ?? error.message);
    } finally {
      setBusy("");
    }
  }, [showError, showNotice]);

  const refreshVault = useCallback(async () => {
    if (!isAddress(vaultAddress)) {
      setVault(null);
      setTransactions([]);
      return;
    }

    setBusy("refresh");

    try {
      const provider = getInjectedProvider();
      const signer = account ? await provider.getSigner() : provider;
      const contract = await getVaultContract(vaultAddress, signer);
      const [balance, owners, requiredApprovals, transactionCount] = await Promise.all([
        provider.getBalance(vaultAddress),
        contract.getOwners(),
        contract.requiredApprovals(),
        contract.getTransactionCount()
      ]);

      const txIds = Array.from({ length: Number(transactionCount) }, (_, index) => BigInt(index));
      const loadedTransactions = await Promise.all(
        txIds.map(async (txId) => {
          const [to, value, data, executed, approvals] = await contract.getTransaction(txId);
          const ownerApprovals = await Promise.all(
            owners.map(async (owner) => ({
              owner,
              approved: await contract.hasApproved(txId, owner)
            }))
          );

          return {
            id: txId,
            to,
            value,
            data,
            executed,
            approvals,
            ownerApprovals
          };
        })
      );

      setVault({
        address: vaultAddress,
        balance,
        owners,
        requiredApprovals,
        transactionCount
      });
      setTransactions(loadedTransactions.reverse());
      showNotice("Vault refreshed.");
    } catch (error) {
      setVault(null);
      setTransactions([]);
      showError(error.shortMessage ?? error.message);
    } finally {
      setBusy("");
    }
  }, [account, showError, showNotice, vaultAddress]);

  const loadVault = useCallback(() => {
    if (!isAddress(draftVaultAddress)) {
      showError("Enter a valid GuardVault address.");
      return;
    }

    saveVaultAddress(draftVaultAddress);
    setVaultAddress(draftVaultAddress);
    showNotice("Vault address saved.");
  }, [draftVaultAddress, showError, showNotice]);

  const switchNetwork = useCallback(async () => {
    setBusy("network");

    try {
      await switchToLocalChain();
      showNotice("Anvil network selected.");
    } catch (error) {
      showError(error.shortMessage ?? error.message);
    } finally {
      setBusy("");
    }
  }, [showError, showNotice]);

  const runContractAction = useCallback(
    async (busyLabel, action, successMessage) => {
      if (!isAddress(vaultAddress)) {
        showError("Load a valid GuardVault address.");
        return;
      }

      setBusy(busyLabel);

      try {
        const provider = getInjectedProvider();
        const signer = await provider.getSigner();
        const contract = await getVaultContract(vaultAddress, signer);
        const transaction = await action(contract, signer, provider);

        await transaction.wait();
        showNotice(successMessage);
        await refreshVault();
      } catch (error) {
        showError(error.shortMessage ?? error.message);
      } finally {
        setBusy("");
      }
    },
    [refreshVault, showError, showNotice, vaultAddress]
  );

  const submitTransaction = async (event) => {
    event.preventDefault();

    if (!isAddress(form.to)) {
      showError("Enter a valid recipient address.");
      return;
    }

    await runContractAction(
      "submit",
      (contract) => contract.submitTransaction(form.to, parseEth(form.value || "0"), normalizeData(form.data)),
      "Transaction submitted."
    );

    setForm(EMPTY_FORM);
  };

  const depositToVault = async (event) => {
    event.preventDefault();

    await runContractAction(
      "deposit",
      async (_, signer) =>
        signer.sendTransaction({
          to: vaultAddress,
          value: parseEth(depositAmount)
        }),
      "Deposit sent."
    );

    setDepositAmount("");
  };

  const approveTransaction = (txId) =>
    runContractAction("approve", (contract) => contract.approveTransaction(txId), "Transaction approved.");

  const revokeApproval = (txId) =>
    runContractAction("revoke", (contract) => contract.revokeApproval(txId), "Approval revoked.");

  const executeTransaction = (txId) =>
    runContractAction("execute", (contract) => contract.executeTransaction(txId), "Transaction executed.");

  const copyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      showNotice("Address copied.");
    } catch (error) {
      showError("Could not copy address.");
    }
  };

  useEffect(() => {
    if (!window.ethereum) {
      return undefined;
    }

    const handleAccountsChanged = (accounts) => {
      setAccount(accounts[0] ?? "");
      if (!accounts[0]) {
        showNotice("Wallet disconnected.");
      }
    };

    const handleChainChanged = (nextChainId) => {
      setChainId(BigInt(nextChainId));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [showNotice]);

  useEffect(() => {
    if (isAddress(vaultAddress) && isConnected) {
      refreshVault();
    }
  }, [isConnected, refreshVault, vaultAddress]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <ShieldCheck size={25} aria-hidden="true" />
          </span>
          <div className="brand-copy">
            <span>Multi-Signature Wallet</span>
            <h1>GuardVault</h1>
          </div>
        </div>

        <div className="session-bar">
          <StatusPill tone={isLocalChain ? "green" : "amber"} icon={<Network size={16} aria-hidden="true" />}>
            {chainLabel}
          </StatusPill>

          {isConnected ? (
            <button className="button button-secondary" type="button" title={account} onClick={() => copyAddress(account)}>
              <Wallet size={17} aria-hidden="true" />
              {shortenAddress(account)}
            </button>
          ) : (
            <button className="button button-primary" type="button" onClick={connectWallet} disabled={busy === "connect"}>
              {busy === "connect" ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <PlugZap size={17} aria-hidden="true" />}
              Connect
            </button>
          )}
        </div>
      </header>

      <section className="control-bar">
        <label className="field vault-address-field">
          <span>GuardVault Contract</span>
          <input
            value={draftVaultAddress}
            onChange={(event) => setDraftVaultAddress(event.target.value)}
            placeholder="0x..."
            spellCheck="false"
          />
        </label>

        <div className="control-actions">
          <button className="button button-primary" type="button" onClick={loadVault}>
            <Check size={17} aria-hidden="true" />
            Load
          </button>

          <button className="button button-secondary" type="button" onClick={refreshVault} disabled={!isConnected || busy === "refresh"}>
            {busy === "refresh" ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <RefreshCw size={17} aria-hidden="true" />}
            Refresh
          </button>

          <button className="button button-secondary" type="button" onClick={switchNetwork} disabled={busy === "network"}>
            {busy === "network" ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Network size={17} aria-hidden="true" />}
            Anvil
          </button>
        </div>
      </section>

      {(notice || error) && (
        <section className={`notice ${error ? "notice-error" : "notice-success"}`}>
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error || notice}</span>
        </section>
      )}

      <section className="overview-grid">
        <MetricPanel icon={<Landmark size={22} aria-hidden="true" />} label="Balance" value={vault ? formatEth(vault.balance) : "0 ETH"} />
        <MetricPanel icon={<Users size={22} aria-hidden="true" />} label="Owners" value={vault ? vault.owners.length.toString() : "0"} />
        <MetricPanel
          icon={<ShieldCheck size={22} aria-hidden="true" />}
          label="Approval Rule"
          value={vault ? `${vault.requiredApprovals.toString()} of ${vault.owners.length}` : "0 of 0"}
        />
        <MetricPanel
          icon={<ClipboardList size={22} aria-hidden="true" />}
          label="Transactions"
          value={vault ? vault.transactionCount.toString() : "0"}
        />
      </section>

      <section className="workspace-grid">
        <div className="panel vault-panel">
          <PanelHeader
            title="Vault"
            subtitle={isVaultLoaded ? shortenAddress(vault.address) : "No vault loaded"}
            icon={<Landmark size={20} aria-hidden="true" />}
            action={
              isVaultLoaded ? (
                <button className="icon-button" type="button" title="Copy vault address" onClick={() => copyAddress(vault.address)}>
                  <Copy size={16} aria-hidden="true" />
                </button>
              ) : null
            }
          />

          <div className="owner-list">
            {vault?.owners.map((owner, index) => (
              <div className="owner-row" key={owner}>
                <span className="owner-index">{index + 1}</span>
                <button className="address-button" type="button" title={owner} onClick={() => copyAddress(owner)}>
                  {shortenAddress(owner)}
                </button>
                {isSameAddress(owner, account) && <span className="mini-badge">You</span>}
              </div>
            ))}

            {!vault && <EmptyState label="Connect wallet and load a vault." />}
          </div>

          <form className="deposit-form" onSubmit={depositToVault}>
            <label className="field">
              <span>Deposit ETH</span>
              <input
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0.25"
              />
            </label>
            <button className="button button-success" type="submit" disabled={!isConnected || !isVaultLoaded || busy === "deposit"}>
              {busy === "deposit" ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Landmark size={17} aria-hidden="true" />}
              Deposit
            </button>
          </form>
        </div>

        <form className="panel create-panel" onSubmit={submitTransaction}>
          <PanelHeader
            title="Create Transaction"
            subtitle={isCurrentAccountOwner ? "Owner connected" : "Owner required"}
            icon={<Send size={20} aria-hidden="true" />}
          />

          <div className="form-grid">
            <label className="field field-span">
              <span>Recipient</span>
              <input
                value={form.to}
                onChange={(event) => setForm((current) => ({ ...current, to: event.target.value }))}
                placeholder="0x..."
                spellCheck="false"
              />
            </label>

            <label className="field">
              <span>ETH Amount</span>
              <input
                value={form.value}
                onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
                inputMode="decimal"
                placeholder="0.5"
              />
            </label>

            <label className="field">
              <span>Data</span>
              <input
                value={form.data}
                onChange={(event) => setForm((current) => ({ ...current, data: event.target.value }))}
                placeholder="0x"
                spellCheck="false"
              />
            </label>
          </div>

          <button
            className="button button-primary full-width"
            type="submit"
            disabled={!isConnected || !isVaultLoaded || !isCurrentAccountOwner || busy === "submit"}
          >
            {busy === "submit" ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
            Submit Transaction
          </button>
        </form>
      </section>

      <section className="transactions-section">
        <div className="section-header">
          <div>
            <h2>Transactions</h2>
            <p>
              {pendingTransactions.length} pending / {transactions.length} total
            </p>
          </div>

          <div className="segmented-control" role="tablist" aria-label="Transaction filter">
            <button type="button" className={txFilter === "pending" ? "active" : ""} onClick={() => setTxFilter("pending")}>
              Pending
            </button>
            <button type="button" className={txFilter === "executed" ? "active" : ""} onClick={() => setTxFilter("executed")}>
              Executed
            </button>
            <button type="button" className={txFilter === "all" ? "active" : ""} onClick={() => setTxFilter("all")}>
              All
            </button>
          </div>
        </div>

        <div className="transaction-list">
          {visibleTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id.toString()}
              transaction={transaction}
              account={account}
              requiredApprovals={vault?.requiredApprovals ?? 0n}
              isOwner={isCurrentAccountOwner}
              busy={busy}
              onApprove={approveTransaction}
              onRevoke={revokeApproval}
              onExecute={executeTransaction}
              onCopy={copyAddress}
            />
          ))}

          {visibleTransactions.length === 0 && (
            <EmptyState label={isVaultLoaded ? "No transactions in this view." : "No vault loaded."} />
          )}
        </div>
      </section>
    </main>
  );
}

function MetricPanel({ icon, label, value }) {
  return (
    <div className="metric-panel">
      <span className="metric-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function PanelHeader({ title, subtitle, icon, action }) {
  return (
    <div className="panel-header">
      <span className="panel-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && <div className="panel-action">{action}</div>}
    </div>
  );
}

function StatusPill({ children, icon, tone }) {
  return (
    <span className={`status-pill status-${tone}`}>
      {icon}
      {children}
    </span>
  );
}

function EmptyState({ label }) {
  return <div className="empty-state">{label}</div>;
}

function TransactionItem({ transaction, account, requiredApprovals, isOwner, busy, onApprove, onRevoke, onExecute, onCopy }) {
  const viewerApproval = transaction.ownerApprovals.some(
    (approval) => approval.approved && isSameAddress(approval.owner, account)
  );
  const isReady = !transaction.executed && transaction.approvals >= requiredApprovals;
  const approvalText = `${transaction.approvals.toString()} / ${requiredApprovals.toString()}`;
  const required = Number(requiredApprovals) || 1;
  const progress = Math.min(100, (Number(transaction.approvals) / required) * 100);

  return (
    <article className="transaction-row">
      <div className="transaction-row-header">
        <div className="transaction-title">
          <span className={`state-dot ${transaction.executed ? "state-executed" : isReady ? "state-ready" : "state-pending"}`} />
          <div>
            <h3>Transaction #{transaction.id.toString()}</h3>
            <p>{transaction.executed ? "Executed" : isReady ? "Ready to execute" : "Waiting for approvals"}</p>
          </div>
        </div>

        <StatusBadge tone={transaction.executed ? "green" : isReady ? "blue" : "amber"}>
          {transaction.executed ? "Executed" : isReady ? "Ready" : "Pending"}
        </StatusBadge>
      </div>

      <div className="transaction-meta">
        <Detail label="Recipient">
          <button className="address-button" type="button" title={transaction.to} onClick={() => onCopy(transaction.to)}>
            {shortenAddress(transaction.to)}
          </button>
        </Detail>
        <Detail label="Value">{formatEth(transaction.value)}</Detail>
        <Detail label="Approvals">{approvalText}</Detail>
        <Detail label="Data">{transaction.data === "0x" ? "None" : transaction.data}</Detail>
      </div>

      <div className="approval-progress" aria-label={`Approvals ${approvalText}`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="approval-strip">
        {transaction.ownerApprovals.map((approval) => (
          <span className={approval.approved ? "approval-chip approved" : "approval-chip"} key={approval.owner} title={approval.owner}>
            {approval.approved && <Check size={12} aria-hidden="true" />}
            {shortenAddress(approval.owner)}
          </span>
        ))}
      </div>

      <div className="transaction-actions">
        <button
          className="button button-success"
          type="button"
          onClick={() => onApprove(transaction.id)}
          disabled={!isOwner || transaction.executed || viewerApproval || busy === "approve"}
        >
          {busy === "approve" ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          Approve
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => onRevoke(transaction.id)}
          disabled={!isOwner || transaction.executed || !viewerApproval || busy === "revoke"}
        >
          {busy === "revoke" ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
          Revoke
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={() => onExecute(transaction.id)}
          disabled={transaction.executed || !isReady || busy === "execute"}
        >
          {busy === "execute" ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          Execute
        </button>
      </div>
    </article>
  );
}

function StatusBadge({ children, tone }) {
  return <span className={`status-badge badge-${tone}`}>{children}</span>;
}

function Detail({ label, children }) {
  return (
    <div className="detail">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

export default App;
