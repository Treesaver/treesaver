<?PHP

header('Content-type: application/json');

$toc = array(
  array(
    'url' => 'index.php'
  ),
  array(
    'url' => '?article=1'
  ),
  array(
    'url' => '?article=2'
  )
);

echo json_encode($toc);

?>
