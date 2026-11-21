<?php
/**
 * Membuat app/users.php berisi akun demo per role dengan kata sandi acak (disimpan sebagai hash bcrypt).
 * Pemakaian: php server/tools/make-users.php <file-output-kredensial>
 * Semua akun wajib mengganti kata sandi saat login pertama.
 * Kata sandi asli hanya ditulis ke file kredensial yang Anda tentukan, bukan ke repo atau server.
 */
$accounts = [
    'superadmin' => ['Super Admin Platform', 'superadmin@examcbt.local', 'super_admin'],
    'orgadmin'   => ['Rahmat Hidayat', 'rahmat.h@lsptn.id', 'org_admin'],
    'training'   => ['Wulan Pratiwi', 'wulan.p@lsptn.id', 'training_admin'],
    'examadmin'  => ['Budi Santoso', 'budi.s@lsptn.id', 'exam_admin'],
    'penguji'    => ['Dewanti Lestari', 'dewanti.l@lsptn.id', 'examiner'],
    'sertifikat' => ['Hana Prameswari', 'hana.p@lsptn.id', 'certificate_admin'],
    'finance'    => ['Sari Mulyani', 'sari.m@lsptn.id', 'finance'],
    'auditor'    => ['Tommy Kurniawan', 'tommy.k@lsptn.id', 'auditor'],
    'peserta'    => ['Nadia Putri Anggraini', 'nadia.anggraini@mail.id', 'participant'],
];
$alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
$gen = function () use ($alphabet) {
    $s = '';
    for ($i = 0; $i < 14; $i++) $s .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    return $s;
};
$out = "<?php\n// Dibuat oleh tools/make-users.php — JANGAN di-commit. Kata sandi disimpan sebagai hash bcrypt.\nreturn [\n";
$creds = "username\trole\tpassword\n";
foreach ($accounts as $u => [$name, $email, $role]) {
    $pw = $gen();
    $hash = password_hash($pw, PASSWORD_BCRYPT, ['cost' => 11]);
    $out .= sprintf("    %s => ['name' => %s, 'email' => %s, 'role' => %s, 'active' => true, 'must_change' => true, 'hash' => %s],\n",
        var_export($u, true), var_export($name, true), var_export($email, true), var_export($role, true), var_export($hash, true));
    $creds .= "$u\t$role\t$pw\n";
}
$out .= "];\n";
file_put_contents(__DIR__ . '/../app/users.php', $out);
file_put_contents($argv[1] ?? 'credentials.tsv', $creds);
echo "users.php dibuat untuk " . count($accounts) . " akun\n";
