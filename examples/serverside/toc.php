<?PHP

header('Content-type: application/json');

$toc = array(
  'contents' => array(
    'index.php',
    '?article=1',
    '?article=2'
  )
);

echo json_encode($toc);

?>
